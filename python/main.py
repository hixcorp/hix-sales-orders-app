from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, DirectoryPath
from sqlalchemy import Engine
from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from settings import ItemSettings
import utils
import os
from mssql import get_all_items

from db_management import DATABASE_NAME, SavedDatabase, UserInput, get_current_db, get_local_db, get_local_db_engine, get_current_db_engine, set_current_database, start_db, update_current_database
from fastapi import Depends

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

HOST='127.0.0.1'
PORT=8000
BASE_DIR = utils.get_base_directory()
TEMP_DIR = os.path.join(BASE_DIR,'temp')

# Define the SQLAlchemy base
Base = declarative_base()

class DatabaseLocation(BaseModel):
    new_location: DirectoryPath
    location_type: str
    name: Optional[str] = ""

class DatabaseChangeResponse(BaseModel):
    message: str
    new_path: str

# Pydantic models
class UserInputBase(BaseModel):
    id: str
    additional_info: str = ""
    action: str = ""
    action_owner: str = ""
    last_updated: Optional[datetime] = None


class UserInputCreate(UserInputBase):
    pass

class UserInputUpdate(UserInputBase):
    pass

class UserInputPartialUpdate(BaseModel):
    id: str
    additional_info: str = None
    action: str = None
    action_owner: str = None
    last_updated: Optional[datetime] = None

@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    response = await call_next(request)
    for key, value in response.headers.items():
        print(f"{key}: {value}")  # Log headers to the console for debugging
    return response

@app.get('/all_items')
async def all_items():
    response = get_all_items()
    if response['data']:
        return JSONResponse(status_code=200, content=response)
    else:
        raise HTTPException(status_code=404, detail='No items found')

@app.get("/get_all_user_input", response_model=List[UserInputBase])
def read_all_user_inputs(db: Session = Depends(get_current_db)):
    return db.query(UserInput).all()

@app.get("/get_user_input_by_id/{id}", response_model=UserInputBase)
def read_user_input_by_id(id: str, db: Session = Depends(get_current_db)):
        result = db.query(UserInput).filter(UserInput.id == id).first()
        if result is None:
            # Create a new record if not found
            new_user_input = UserInput(id=id)  # Default values are taken from the model definitions
            db.add(new_user_input)
            db.commit()
            result = new_user_input
        if result is None:
            raise HTTPException(status_code=404, detail="User input not found")
        return result

@app.post("/update_user_input_by_id", response_model=UserInputBase)
def update_user_input_by_id(user_input: UserInputUpdate, db: Session = Depends(get_current_db)):
    try:
        obj = db.query(UserInput).filter(UserInput.id == user_input.id).first()
        if obj is None:
            # If not found, create a new record
            obj = UserInput(**user_input.model_dump())
            db.add(obj)
        else:
            for var, value in user_input.model_dump().items():
                setattr(obj, var, value)
        db.commit()
        return obj
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Data update failed")
    finally:
        db.close()

@app.patch("/update_user_input_cols_by_id", response_model=UserInputBase)
def update_user_input_cols_by_id(user_input: UserInputPartialUpdate, db: Session = Depends(get_current_db)):
    try:
        obj = db.query(UserInput).filter(UserInput.id == user_input.id).first()
        if obj is None:
            # If not found, create a new record
            data = user_input.model_dump(exclude_none=True)
            obj = UserInput(**data)
            db.add(obj)
        else:
            data = user_input.model_dump(exclude_none=True)
            for key, value in data.items():
                setattr(obj, key, value)
        db.commit()
        return obj
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Data update failed")
    finally:
        db.close()

@app.get("/current_database")
def get_current_database(current_engine: Engine = Depends(get_current_db_engine)):
    return {"current_database": os.path.normcase(str(current_engine.url))}

@app.get("/local_database")
def get_local_database(local_engine: Engine = Depends(get_local_db_engine)):
    return {"local_database": os.path.normcase(str(local_engine.url))}

@app.get("/using_default_database")
def using_default_database(current_engine: Engine = Depends(get_current_db_engine), local_engine: Engine = Depends(get_local_db_engine)):
    return {"using_default": str(current_engine.url) == str(local_engine.url)}

@app.get("/process_id")
def process_id():
    return JSONResponse(status_code=200, content={"pid": str(os.getpid())}) 

@app.post("/add_preferred_database")
def add_preferred_database(new_entry: DatabaseLocation, db: Session = Depends(get_local_db)):
    # Validate the new location
    new_database_path = validate_new_location(new_entry.new_location, new_entry.location_type)

    # Check for existing database entries
    existing_by_name = db.query(SavedDatabase).filter(SavedDatabase.name == new_entry.name).first() if new_entry.name else None
    existing_by_path = db.query(SavedDatabase).filter(SavedDatabase.path == new_database_path).first()

    # Handle potential conflicts
    if existing_by_name and existing_by_path and existing_by_name != existing_by_path:
        raise HTTPException(status_code=409, detail="Conflict: different records found with the same name and path.")
    
    # Define the database to update or create
    database_to_use = existing_by_name or existing_by_path

    if database_to_use:
        # Update existing database record
        database_to_use.name = new_entry.name or database_to_use.name
        database_to_use.path = new_database_path
        database_to_use.preferred = True  # Set as preferred if being added or updated
    else:
        # Create new database record
        database_to_use = SavedDatabase(
            name=new_entry.name,
            path=new_database_path,
            preferred=True
        )
        db.add(database_to_use)
    db.commit()

    # Update the current engine and session
    update_current_database(database_to_use)
    return {"message": "Database updated successfully", "data": database_to_use}

def validate_new_location(new_location:str, location_type:str):
    match location_type:
        case 'file':
            if not os.path.isfile(new_location):
                raise HTTPException(status_code=400, detail='Invalid file path')
            if not new_location.endswith('.db'):
                raise HTTPException(status_code=400, detail='Database file must have a valid .db extension')
            return new_location
        case 'folder':
            if not os.path.isdir(new_location):
                raise HTTPException(status_code=400, detail="Invalid database path")
            if not os.path.exists(new_location):
                os.path.makedirs(new_location, exist_ok=True)
            new_database_path = os.path.join(new_location, DATABASE_NAME)

            return new_database_path
        case 'url':
            raise HTTPException(status_code=400, detail='URL database types are not supported')


class ColumnNames(BaseModel):
    column_names: list[str]

class ItemSettingsUpdate(BaseModel):
    column_name: str
    hidden: Optional[bool] = False
    display_name: Optional[str] = False

class UpdateItemSettings(BaseModel):
    items: list[ItemSettingsUpdate]

@app.get("/get_all_item_settings", response_model=List[ItemSettingsUpdate])
def get_all_item_settings(db: Session = Depends(get_local_db)):
    return db.query(ItemSettings).all()

@app.post("/get_item_settings_by_column_names")
def get_item_settings_by_column_names(column_names: ColumnNames, db: Session = Depends(get_local_db)):
    results = {}
    for name in column_names.column_names:
        setting = db.query(ItemSettings).filter(ItemSettings.column_name == name).first()
        if not setting:
            # Create a new setting if it doesn't exist
            setting = ItemSettings(column_name=name)
            db.add(setting)
            db.commit()
        results[name] =setting
    return results

@app.post("/update_item_settings_by_column_names")
def update_item_settings_by_column_names(update_items:UpdateItemSettings, db: Session = Depends(get_local_db)):
    for item in update_items.items:
        try:
            setting = db.query(ItemSettings).filter(ItemSettings.column_name == item.column_name).first()
        except Exception as e:
            print(e)
            setting = None
        if not setting:
            # Create new settings if it doesn't exist
            setting = ItemSettings(column_name=item.column_name)
            db.add(setting)
        if item.hidden is not None:
            setting.hidden = item.hidden
        if item.display_name is not None:
            setting.display_name = item.display_name
        db.commit()
    return {"message" : "Item settings updated successfully"}

if __name__ == "__main__":
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)
    
    print(f"Temp Directory: {TEMP_DIR}")
    # utils.clear_temp_directory(TEMP_DIR)
    start_db()
    uvicorn.run(app=app,host=HOST, port=PORT)
    