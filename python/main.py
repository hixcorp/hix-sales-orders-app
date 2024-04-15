import shutil
import signal
from fastapi import FastAPI, HTTPException, File, Request, UploadFile, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import uvicorn
import utils
from typing import Optional
import os

app = FastAPI()
DATABASE = 'HG_Sales_DB.db'
HOST='127.0.0.1'
PORT=8000
BASE_DIR = utils.get_base_directory()
DATABASE = os.path.join(BASE_DIR,DATABASE)
TEMP_DIR = os.path.join(BASE_DIR,'temp')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",'*'],
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
    print(f"Database Path: {DATABASE}")
    print(f"Temp Directory: {TEMP_DIR}")
    uvicorn.run(app=app,host=HOST, port=PORT)