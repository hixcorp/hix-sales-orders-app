import json
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from typing import List
import asyncio
from datetime import datetime, timedelta

from sqlalchemy import func
from db_management import UserInput, get_current_db_url, get_currentdb, get_currentengine
from utils import timenow 

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        try: self.active_connections.append(websocket)
        except: print("Could not accept websocket client")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            try: self.active_connections.remove(websocket)
            except: print('Could not disconnect socket')

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            # await connection.send_text(message)
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send message: {e}")
                try: self.disconnect(connection)
                except: pass

manager = ConnectionManager()

last_checked = timenow()

def get_ws_manager():
    global manager
    try:
        yield manager
    finally:
        pass

async def check_for_changes():
    global last_checked
    db=get_currentdb()
    engine = get_currentengine()
    while True:
        try:
            # Check every 10 seconds
            await asyncio.sleep(10) 
            # Update the database if it has changed
            if engine.url != get_current_db_url():
                db = get_currentdb()
                engine = get_currentengine()

            
            if(db):
                # print('checking db for updates')
                # print(f'Last Checked: {last_checked.isoformat()}')
                recent_changes = db.query(UserInput).filter(UserInput.last_updated > last_checked)
                # recent_changes = await db.execute(select(UserInput).where(UserInput.last_updated > last_checked))
                results = recent_changes.all()
                if results:
                    # print('New Update')
                    await manager.broadcast(json.dumps(jsonable_encoder(results),indent=4))
                last_checked = timenow()#datetime.now()+ timedelta(hours=5)
        except Exception as e:
            print(f"Error in check_for_changes: {e}")

