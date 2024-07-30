import asyncio
import base64
from datetime import datetime
import json
import argparse
import logging
import sys
from urllib.parse import urlencode
from uuid import UUID, uuid4
from fastapi import Cookie, FastAPI, File, HTTPException, Query, Request, Response, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
import httpx
from pydantic import BaseModel, DirectoryPath, Field, field_validator
from sqlalchemy import Engine
from sqlalchemy.orm import Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi.middleware.cors import CORSMiddleware
from fastapi_sessions.frontends.implementations import SessionCookie, CookieParameters
from fastapi_sessions.backends.implementations import InMemoryBackend

import uvicorn
from settings import ItemSettings
import utils
import os
from mssql import get_all_items, get_filtered_items

from db_management import DATABASE_NAME, AllowedInput, SavedDatabase, UserInput, get_current_db, get_existing_allowed_inputs, get_local_db, get_local_db_engine, get_current_db_engine, set_current_database, start_db, update_current_database
from fastapi import Depends
from fastapi.encoders import jsonable_encoder
import polars as pl

from websocket import ConnectionManager, check_for_changes, get_ws_manager
import jwt
from jwt import PyJWKClient
from dotenv import load_dotenv
from session import *
from db_conn import *

load_dotenv()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

DEV_HOST='127.0.0.1'
DEV_PORT=3000
PROD_HOST='10.1.1.128'
PROD_PORT=8081
HOST=DEV_HOST
PORT=PROD_PORT
BASE_DIR = utils.get_base_directory()
TEMP_DIR = os.path.join(BASE_DIR,'temp')
SESSION_TOKEN = ''

# Define the SQLAlchemy base
Base = declarative_base()

class DatabaseLocation(BaseModel):
    new_location: DirectoryPath | str
    location_type: str
    name: Optional[str] = ""

class DatabaseChangeResponse(BaseModel):
    message: str
    new_path: str

# Pydantic models
class UserInputBase(BaseModel):
    id: str
    order_status: Optional[str] = ''
    additional_info: Optional[str] = None
    action: Optional[str] = None
    action_owner: Optional[str] = None
    last_updated: Optional[datetime] = None
    updated_by: Optional[str] = None
    # id: str
    # order_status: str = ''
    # additional_info: str = ''
    # action: str = ''
    # action_owner: str = ''
    # last_updated: Optional[datetime] = None
    # updated_by: str= ''

class UserInputCreate(UserInputBase):
    pass

class UserInputUpdate(UserInputBase):
    pass

class UserInputPartialUpdate(BaseModel):
    id: str
    order_status: Optional[str] = ''
    additional_info: Optional[str] = None
    action: Optional[str] = None
    action_owner: Optional[str] = None
    last_updated: Optional[datetime] = None
    updated_by: Optional[str] = None

@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    response = await call_next(request)
    # for key, value in response.headers.items():
    #     print(f"{key}: {value}")  # Log headers to the console for debugging
    return response

@app.get('/all_items')
async def all_items():
    try:
        response = get_all_items()
        if response['data']:
            return JSONResponse(status_code=200, content=response)
        else:
            raise HTTPException(status_code=404, detail='No items found')
    except Exception as e:
        return HTTPException(status_code=500, detail={'errors':str(e)})

@app.get('/all_items/no_cache')
async def all_items_no_cache():
    response = get_all_items(use_cached=False)
    if response['data']:
        return JSONResponse(status_code=200, content=response)
    else:
        raise HTTPException(status_code=404, detail='No items found')

@app.get("/get_all_user_input", response_model=List[UserInputBase])
async def read_all_user_inputs(db: Session = Depends(get_current_db)):
    try:
        user_input = db.query(UserInput).all()
        return user_input
    except Exception as e:
        print(e)
        return HTTPException(status_code=500, detail={'message':'could not get data', 'error':str(e)})

@app.get("/get_user_input_by_id/{id}", response_model=UserInputBase)
async def read_user_input_by_id(id: str, db: Session = Depends(get_current_db)):
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
async def update_user_input_by_id(user_input: UserInputUpdate, db: Session = Depends(get_current_db)):
    try:
        obj = db.query(UserInput).filter(UserInput.id == user_input.id).first()
        if obj is None:
            # If not found, create a new record
            obj = UserInput(**user_input.model_dump())
            db.add(obj)
            db.commit()
            obj = db.query(UserInput).filter(UserInput.id == user_input.id).first()
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


@app.delete("/remove_allowed_input/{input_type}/{input_value}")
async def remove_allowed_input(input_type: str, input_value: str, db: Session = Depends(get_current_db)):
    # Find and remove the specified allowed input
    allowed_input = db.query(AllowedInput).filter(
        AllowedInput.type == input_type,
        AllowedInput.value == input_value
    ).first()

    if not allowed_input:
        raise HTTPException(status_code=404, detail="Input type and value not found")

    db.delete(allowed_input)
    db.commit()

    # Determine the field to update in UserInput based on input_type
    field_to_update = {
        'order_status': UserInput.order_status,
        'action_owner': UserInput.action_owner
    }.get(input_type)

    if field_to_update is not None:
        # Update UserInput entries where the field matches the allowed input value
        db.query(UserInput).filter(
            field_to_update == input_value
        ).update({field_to_update: ''}, synchronize_session='fetch')
        db.commit()

    return {"message": f"Allowed input '{input_value}' for type '{input_type}' removed and user inputs updated"}

class AllowedInputCreate(BaseModel):
    type: str
    value: str

@app.post("/add_allowed_input", response_model=dict)
async def add_allowed_input(allowed_input: AllowedInputCreate, db: Session = Depends(get_current_db)):
    # Check if the input already exists
    existing_input = db.query(AllowedInput).filter(
        AllowedInput.type == allowed_input.type,
        AllowedInput.value == allowed_input.value
    ).first()

    if existing_input:
        raise HTTPException(status_code=400, detail="This input type and value already exists.")

    # Create a new AllowedInput entry
    new_allowed_input = AllowedInput(type=allowed_input.type, value=allowed_input.value)
    db.add(new_allowed_input)
    db.commit()

    return {"message": "New allowed input added successfully", "type": allowed_input.type, "value": allowed_input.value}

@app.patch("/update_user_input_cols_by_id", response_model=UserInputBase)
async def update_user_input_cols_by_id(user_input: UserInputPartialUpdate, db: Session = Depends(get_current_db)):
    try:
        obj = db.query(UserInput).filter(UserInput.id == user_input.id).first()
        if obj is None:
            # If not found, create a new record
            data = user_input.model_dump(exclude_unset=True, exclude_none=True)
            obj = UserInput(**data)
            db.add(obj)
        else:
            data = user_input.model_dump(exclude_unset=True, exclude_none=True)
            for key, value in data.items():
                setattr(obj, key, value)
            obj.last_updated = utils.timenow()
        db.commit()
        db.refresh(obj)  # Ensure the object is refreshed and still connected
        return obj
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Data update failed: " + str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred: " + str(e))

@app.get("/current_database")
async def get_current_database(current_engine: Engine = Depends(get_current_db_engine)):
    return {"current_database": utils.normsqlitepath(current_engine.url)}

@app.get("/local_database")
async def get_local_database(local_engine: Engine = Depends(get_local_db_engine)):
    return {"local_database": utils.normsqlitepath(local_engine.url)}

@app.get("/using_default_database")
async def using_default_database(current_engine: Engine = Depends(get_current_db_engine), local_engine: Engine = Depends(get_local_db_engine)):
    return {"using_default": utils.normsqlitepath(current_engine.url) == utils.normsqlitepath(local_engine.url)}

@app.get("/use_default_database")
async def use_default_database(db: Session = Depends(get_local_db)):
    local_db = db.query(SavedDatabase).filter(SavedDatabase.name == 'Local Database').first()

    #  First set all to not preferred
    db.query(SavedDatabase).update({SavedDatabase.preferred: False})
    # Then set the current one to preferred
    local_db.preferred = True
    db.commit()

    # Update the current engine and session
    update_current_database(local_db)
    return {"message": "Database updated successfully", "data": local_db}

@app.get("/use_preferred_database")
async def use_default_database(db: Session = Depends(get_local_db)):
    preferred_db = db.query(SavedDatabase).filter(SavedDatabase.preferred == True).first()

    #  First set all to not preferred
    db.query(SavedDatabase).update({SavedDatabase.preferred: False})
    # Then set the current one to preferred
    preferred_db.preferred = True
    db.commit()

    # Update the current engine and session
    update_current_database(preferred_db)
    return {"message": "Database updated successfully", "data": preferred_db}

@app.get("/process_id")
async def process_id():
    return JSONResponse(status_code=200, content={"pid": str(os.getpid())}) 

@app.post("/add_preferred_database")
async def add_preferred_database(new_entry: DatabaseLocation, db: Session = Depends(get_local_db)):
    # Validate the new location
    new_database_path = validate_new_location(new_entry.new_location, new_entry.location_type)
    new_database_path = utils.normsqlitepath(new_database_path)

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
    
    #  First set all to not preferred
    db.query(SavedDatabase).update({SavedDatabase.preferred: False})
    # Then set the current one to preferred
    database_to_use.preferred = True
    db.commit()

    # Update the current engine and session
    update_current_database(database_to_use)
    return {"message": "Database updated successfully", "data": database_to_use}

class DateRange(BaseModel):
    from_date: Optional[datetime] = Field(alias="from", default=None)
    to: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.strftime('%Y-%m-%d')  # Format datetime to match SQL format
        }
        allow_population_by_field_name = True

    @field_validator('*')
    @classmethod
    def parse_date_range(cls,v):
        if isinstance(v,dict) and "from" in v and "to" in v:
            return DateRange(**v)
        return v 
    
class Filters(BaseModel):
    filters: dict[str, str | DateRange]
    
@app.post("/export_to_csv")
async def export_to_csv(filters:Filters, db: Session = Depends(get_current_db)):
    try:
            
        # Fetch the visible columns
        visible_columns = db.query(ItemSettings).filter_by(hidden=False).all()
        column_names = [col.column_name for col in visible_columns if col.hidden == False]

        # Fetch filtered items
        item_data = get_filtered_items(column_names,filters.filters,db)
        if not item_data:
            raise HTTPException(status_code=404, detail="No data available")
        
        # Convert data to dataframe and export
        import polars as pl
        
        df_items = pl.DataFrame(item_data)
        date_columns = [col for col in column_names if col.lower().endswith('_dt')]  # Example heuristic
        for col in date_columns:
            if col in df_items.columns:
                # df[col].map_elements(lambda x: datetime.fromisoformat(x))
                formatted_date = df_items[col].map_elements(lambda x: datetime.fromisoformat(x).strftime('%Y-%m-%d'))
                df_items = df_items.with_columns(formatted_date.alias(col))

        # Fetch and convert UserInput data
        user_input_data = fetch_user_input_data(db)
        if user_input_data:
            df_user_input = pl.DataFrame(user_input_data)

            #Join user input and items
            df_user_input = df_user_input.rename({"id": "ord_no"})
            df_joined = df_items.join(df_user_input, on="ord_no", how="left")
        else:
            df_joined = df_items

        temp_dir = TEMP_DIR
        file_path = os.path.join(temp_dir, 'HIX_Sales_data.csv')

        df_joined.write_csv(file_path)
        return FileResponse(path=file_path, filename='HIX_Sales_data.csv')
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="An error occurred: " + str(e))

def fetch_user_input_data(db):
    # Assuming 'id' corresponds to 'order_no' and is the common field for the join
    user_input_data = db.query(UserInput).all()
    return jsonable_encoder(user_input_data)

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
            # new_database_path = os.path.join(new_location, DATABASE_NAME)
            new_database_path = os.path.join(new_location,DATABASE_NAME)

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
async def get_all_item_settings(db: Session = Depends(get_current_db)):
    return db.query(ItemSettings).all()

@app.post("/get_item_settings_by_column_names")
async def get_item_settings_by_column_names(column_names: ColumnNames, db: Session = Depends(get_current_db)):
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
async def update_item_settings_by_column_names(update_items:UpdateItemSettings, db: Session = Depends(get_current_db)):
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

@app.get("/allowed_inputs/{input_type}")
async def get_allowed_inputs(input_type: str, db: Session = Depends(get_current_db)):
    allowed_inputs = db.query(AllowedInput).filter(AllowedInput.type == input_type).all()
    if not allowed_inputs:
        raise HTTPException(status_code=404, detail="No entries found for the given type")
    return allowed_inputs

@app.post("/allowed_inputs/{input_type}")
async def add_allowed_input(input_type: str, value: str = Query(...), db: Session = Depends(get_current_db)):
    existing_input = db.query(AllowedInput).filter(AllowedInput.type == input_type, AllowedInput.value == value).first()
    if existing_input:
        raise HTTPException(status_code=400, detail="This value already exists for the given type")
    new_input = AllowedInput(type=input_type, value=value)
    db.add(new_input)
    db.commit()
    return {"message": "New value added successfully", "data": new_input}

@app.delete("/allowed_inputs/{input_type}/{value_id}")
async def delete_allowed_input(input_type: str, value_id: int, db: Session = Depends(get_current_db)):
    input_to_delete = db.query(AllowedInput).filter(AllowedInput.id == value_id, AllowedInput.type == input_type).first()
    if not input_to_delete:
        raise HTTPException(status_code=404, detail="No entry found with the given ID and type")
    db.delete(input_to_delete)
    db.commit()
    return {"message": "Value deleted successfully"}


@app.post("/import_user_input/")
async def import_user_input(file: UploadFile = File(...), db: Session = Depends(get_current_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")

    try:
        content = await file.read()
        df = pl.read_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing the CSV file: {str(e)}")

    required_columns = {'Status', 'Order Number','Additional Information', 'Action', 'Action Owner'}
    if not required_columns.issubset(set(df.columns)):
        missing = required_columns - set(df.columns)
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")

    # Fetch existing allowed inputs
    existing_statuses = get_existing_allowed_inputs(db, "order_status")
    existing_owners = get_existing_allowed_inputs(db, "action_owner")
    added_statuses = []
    added_owners = []
    for row in df.rows(named=True):
        status = row['Status']
        if status: status = str(status).strip().upper()
        action_owner = row['Action Owner']
        if action_owner: action_owner = str(action_owner).strip().upper()

        # Check and add new Status to allowed_inputs if not exists
        if status and (status,) not in existing_statuses and status not in added_statuses:
            db.add(AllowedInput(type='order_status', value=status))
            existing_statuses.add(status)  # Update local set
            added_statuses.append(status)

        # Check and add new Action Owner to allowed_inputs if not exists
        if action_owner and (action_owner,) not in existing_owners and action_owner not in added_owners:
            db.add(AllowedInput(type='action_owner', value=action_owner))
            existing_owners.add(action_owner)  # Update local set
            added_owners.append(action_owner)

        # Process UserInput entries as before
        order_number = row['Order Number']
        additional_info = row['Additional Information']
        action = row['Action']
        if order_number:

            obj = db.query(UserInput).filter(UserInput.id == order_number).first()
            if obj:
                obj.order_status = status
                obj.additional_info = additional_info
                obj.action = action
                obj.action_owner = action_owner
            else:
                new_entry = UserInput(
                    id=order_number,
                    order_status=status,
                    additional_info=additional_info,
                    action=action,
                    action_owner=action_owner
                )
                db.add(new_entry)

    db.commit()

    return {"message": "CSV data has been successfully imported and processed, including updating allowed inputs"}

@app.websocket("/ws/user_inputs")
async def websocket_endpoint(websocket: WebSocket, manager: ConnectionManager=Depends(get_ws_manager), ):
    
    try:
        await manager.connect(websocket)
        while True:
            try:
                data = await websocket.receive_text()
                # You can process messages here if needed
            except WebSocketDisconnect:
                try: 
                    manager.disconnect(websocket)
                except:
                    break
            except Exception as e:
                print(f"Error in websocket communication: {e}")
                manager.disconnect(websocket)
                break
    except Exception as e:
        print(f"Failed to establish WebSocket connection: {e}")
    
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_for_changes())

@app.get("/api/auth/callback/azure-ad")
async def auth_callback( _response:Response,code: str = Query(...), state: str = Query(...),):
    try:
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code not found")

        token_url = 'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token'.format(tenant_id=AZURE_AD_TENANT_ID)
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': 'http://localhost:3000/api/auth/callback/azure-ad',
            'client_id': AZURE_AD_CLIENT_ID,
            'client_secret': AZURE_AD_CLIENT_SECRET,
            'scope': 'openid email profile User.Read'
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=urlencode(token_data), headers=headers)
        tokens = response.json()
        access_token = tokens.get('access_token')
        id_token = tokens.get('id_token')
        scope = tokens.get('scope')

        # Decode the ID Token
        jwks_uri = f'https://login.microsoftonline.com/{AZURE_AD_TENANT_ID}/discovery/v2.0/keys'
        jwks_client = PyJWKClient(jwks_uri)
        signing_key = jwks_client.get_signing_key_from_jwt(id_token)
        user_info = jwt.decode(
            id_token, 
            signing_key.key, 
            algorithms=["RS256"], 
            audience=AZURE_AD_CLIENT_ID #os.getenv("AZURE_AD_CLIENT_ID")
        )
        graph_url = f"https://graph.microsoft.com/v1.0/me/photo/$value"
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            photo_response = await client.get(graph_url, headers=headers)
            if photo_response.status_code == 200:
                photo_data = photo_response.content
                # Convert photo data to base64 or decide how to handle the binary data
                photo_data = base64.b64encode(photo_data).decode('utf-8')
            else:
                photo_data = None 

        user_details = {
            "name": user_info.get("name"),
            "email": user_info.get("email"),
            "image": f'data:image/jpeg;base64,{photo_data}',
            "groups": user_info.get("groups"),
        }

        # Set the secure HTTP-only cookie
        original_url = state
        response = RedirectResponse(url=original_url)
        response.set_cookie(
            key="session_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite='Lax'
        )
    
        session = uuid4()
        data = SessionData(name=user_details["name"], email=user_details['email'], image=user_details['image'])
        await backend.create(session,data)
        cookie.attach_to_response(response, session)
        return response
    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))

@app.get("/start-auth")
async def start_auth(callbackUrl: str = Query(...),):
    # Redirect to Azure AD login page with the necessary parameters
    tenant_id = AZURE_AD_TENANT_ID #os.getenv("AZURE_AD_TENANT_ID")
    client_id = AZURE_AD_CLIENT_ID #os.getenv("AZURE_AD_CLIENT_ID")
    redirect_uri = 'http://localhost:3000/api/auth/callback/azure-ad'
    azure_login_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": "openid profile email",
        "state": callbackUrl  # Use the state parameter to pass the original callback URL safely
    }
    url_with_params = f"{azure_login_url}?{urlencode(params)}"
    return Response(status_code=307, headers={"Location": url_with_params})

@app.get("/api/auth/current_user", dependencies=[Depends(cookie)])
async def get_current_user(session_data: SessionData=Depends(verifier)):

    return {'user':session_data}

@app.post("/api/auth/logout")
async def logout(response: Response, session_id:UUID=Depends(cookie)):
    # Invalidate the session token by setting an expired cookie or clearing the session
    try:
        await backend.delete(session_id=session_id)
    except Exception as e:
        print(e)
        pass
    try:
        cookie.delete_from_response(response)
    except:
        response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

def get_config(mode:str):
    if mode == "PROD":
        return PROD_HOST, PROD_PORT
    else:
        return DEV_HOST, DEV_PORT

if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description="Run the server in DEV or PROD mode. Uses default host/port unless specified.")
    parser.add_argument('-m', '--mode', choices=['DEV', 'PROD'], default='DEV', help="Run mode: DEV or PROD default addr/port")
   
    parser.add_argument('-p', '--port', help="Specify a port to host the server")
    parser.add_argument('-a', '--addr', help="Specify an IP address to host the server")
    args = parser.parse_args()
    mode = args.mode
    HOST, PORT = get_config(mode)

    user_port = args.port
    if user_port: PORT = int(user_port)

    user_addr = args.addr
    if user_addr: HOST = str(user_addr)

    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)

    # Production mode adjustments
    if args.mode == 'PROD':
        with open('application_output.log', 'w') as log_file, open('errors.log', 'w') as error_file:
            sys.stdout = utils.StreamWrapper(log_file)
            sys.stderr = utils.StreamWrapper(error_file)

            try:
                if not os.path.exists(TEMP_DIR):
                    os.makedirs(TEMP_DIR)
                print(f"Temp Directory: {TEMP_DIR}")
                utils.clear_temp_directory(TEMP_DIR)
                start_db()
                print(f'Listening on {HOST}:{PORT}')

                # Configuring Uvicorn without its own logging
                uvicorn.run(app=app, host=HOST, port=PORT, log_config=None, timeout_keep_alive=60, timeout_graceful_shutdown=60, ws_ping_timeout=60)
            finally:
                # Restore original stdout and stderr
                sys.stdout = sys.__stdout__
                sys.stderr = sys.__stderr__
    else:
        if not os.path.exists(TEMP_DIR):
            os.makedirs(TEMP_DIR)
        print(f"Temp Directory: {TEMP_DIR}")
        utils.clear_temp_directory(TEMP_DIR)
        start_db()
        print(f'Listening on {HOST}:{PORT}')
        uvicorn.run(app=app, host=HOST, port=PORT)

