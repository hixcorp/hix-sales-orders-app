import shutil
import signal
import sqlite3
from fastapi import FastAPI, HTTPException, File, Request, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import uvicorn
import utils
from typing import Optional
import os

global DATABASE, LOCAL_DATABASE

app = FastAPI()
DATABASE_NAME = 'HG_Sales_DBv1.db'
HOST='127.0.0.1'
PORT=8000
BASE_DIR = utils.get_base_directory()
DATABASE = os.path.join(BASE_DIR,DATABASE_NAME)
LOCAL_DATABASE = os.path.join(BASE_DIR,DATABASE_NAME)
TEMP_DIR = os.path.join(BASE_DIR,'temp')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.middleware("http")
async def add_custom_headers(request: Request, call_next):
    response = await call_next(request)
    for key, value in response.headers.items():
        print(f"{key}: {value}")  # Log headers to the console for debugging
    return response

@app.post("/change_database_directory")
async def change_database_directory(request:Request):
    global DATABASE
    try:
        # Parse the JSON body manually
        data = await request.json()
        new_location = data.get('new_location')
        location_type = data.get('location_type')

        if not isinstance(new_location, str):
            raise ValueError("Invalid data format: 'new_directory' must be a valid filepath string.")
        if not isinstance(location_type, str):
            raise ValueError("Invalid location type, must be a string of either 'file', 'folder', 'url'")
        
        match location_type:
            case 'file':
                if not os.path.isfile(new_location):
                    raise HTTPException(status_code=400, detail='Invalid file path')
                if not new_location.endswith('.db'):
                    raise HTTPException(status_code=400, detail='Database file must have a valid .db extension')
                new_database_path = new_location
            case 'folder':
                if not os.path.isdir(new_location):
                    raise HTTPException(status_code=400, detail="Invalid database path")
                new_database_path = os.path.join(new_location, DATABASE_NAME)
                if not os.path.exists(new_database_path):
                    # Optionally create a new database or move/copy the old database to the new location
                    # Here we assume we're creating a new database
                    os.makedirs(new_location, exist_ok=True)
            case 'url':
                raise ValueError('URL database types are not supported')

        utils.set_preferred_database(LOCAL_DATABASE,new_database_path)
        DATABASE = utils.load_preferred_database(LOCAL_DATABASE)
        print(f"NEW DB: {DATABASE}")
        return {"message": "Database directory changed successfully", "new_path": os.path.normcase(DATABASE)}
    except HTTPException as e:
        raise e
    except sqlite3.DatabaseError as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        [print(e)]
        raise HTTPException(status_code=500, detail="An error occurred while updating settings.")

@app.get("/use_preferred_database")
async def use_preferred_database():
    global DATABASE, LOCAL_DATABASE
    DATABASE = utils.load_preferred_database(LOCAL_DATABASE)
    return {"path":os.path.normcase(DATABASE)}

@app.get("/use_default_database")
async def use_default_database():
    global DATABASE, LOCAL_DATABASE
    DATABASE = LOCAL_DATABASE
    return {"path":os.path.normcase(DATABASE)}

@app.get("/current_database")
async def get_current_database():
    global DATABASE
    return {"path":os.path.normcase(DATABASE)}

@app.get("/local_database")
async def get_local_database():
    global LOCAL_DATABASE
    return {"path":os.path.normcase(LOCAL_DATABASE)}

@app.get("/using_default_database")
async def get_local_database():
    global LOCAL_DATABASE, DATABASE
    return {"using_default":os.path.normcase(LOCAL_DATABASE) == os.path.normcase(DATABASE)}

@app.get("/reset_default_database")
async def reset_default_database():
    global DATABASE, LOCAL_DATABASE
    utils.set_preferred_database(LOCAL_DATABASE,LOCAL_DATABASE)
    DATABASE = utils.load_preferred_database(LOCAL_DATABASE)
    return {"path":os.path.normcase(DATABASE)}

@app.get("/shutdown")
def shutdown():
    # return JSONResponse(status_code=200, content='Initiating server shutdown')
    os.kill(os.getpid(), signal.SIGINT)  

@app.get("/process_id")
def process_id():
    return JSONResponse(status_code=200, content={"pid": str(os.getpid())}) 
    
@app.get('/all_items')
async def all_items():
    response = utils.get_all_items(DATABASE)
    if response['data']:
        return JSONResponse(status_code=200, content=response)
    else:
        raise HTTPException(status_code=404, detail='No items found')
    
@app.get('/items_settings')
async def item_settings():
    response = utils.get_item_settings(DATABASE)
    if response['data']:
        return JSONResponse(status_code=200, content=response)
    else:
        raise HTTPException(status_code=404, detail='No items found')
    
@app.post("/items_settings")
async def update_item_settings(request: Request):  
    try:
        # Parse the JSON body manually
        data = await request.json()
        settings = data.get('settings')
        print(settings)
        if not isinstance(settings, list):
            raise ValueError("Invalid data format: 'settings' must be a list.")
        utils.update_item_settings(DATABASE, settings)
        return {"message": "Settings updated successfully"}
    except sqlite3.DatabaseError as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        [print(e)]
        raise HTTPException(status_code=500, detail="An error occurred while updating settings.")

@app.post('/get_date_range')
async def get_date_range(start_date:str = Form(...), end_date:str=Form(...)):
    response = utils.get_items_by_date_range(DATABASE,start_date=start_date,end_date=end_date)
    if response['data']:
        return JSONResponse(status_code=200,content=response)
    elif 'errors' in response:
        raise HTTPException(status_code=500, detail=str(response['errors']))
    else:
        raise HTTPException(status_code=404, detail="No items found in the specified date range")
    
@app.post("/upload_xml/")
async def upload_xml(file: UploadFile = File(...), export_csv: bool = Form(False)):
    if not file.filename.endswith('.xml'):
        return {"error": "Invalid file format"}
    print(file)
    # Ensure the 'temp/' directory exists
    os.makedirs(TEMP_DIR, exist_ok=True)  # This will create the directory if it doesn't exist

    # Clear anything in the temp directory
    utils.clear_temp_directory(TEMP_DIR)

    location =  os.path.join(TEMP_DIR,file.filename)
    with open(location, "wb") as buffer:
        # Save file to server temporarily
        shutil.copyfileobj(file.file, buffer)

    # Process the file using the utils.process_xml_file function
    csv_path = location.replace('.xml', '.csv')

    try:
        df = utils.process_xml_file(location, output_to_csv=export_csv)
        utils.store_to_sqlite(df,DATABASE)
        if export_csv:
            # df.write_csv(csv_path)
            return FileResponse(path=csv_path, filename=file.filename.replace('.xml', '.csv'))
        return {"message": "File processed successfully, but no CSV generated"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"schema":[], "data":[], "errors":str(e)})

@app.post('/update_item_status')
async def update_item_status(uuid:str=Form(...), new_status:str=Form(...)):
    try:
        utils.update_status_by_uuid(DATABASE, uuid=uuid,new_status=new_status)
        return {"message":"Status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
if __name__ == "__main__":
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)
    
    print(f"Temp Directory: {TEMP_DIR}")
    utils.clear_temp_directory(TEMP_DIR)
    DATABASE = utils.load_preferred_database(LOCAL_DATABASE)
    print(f"Database Path: {DATABASE}")
    uvicorn.run(app=app,host=HOST, port=PORT)