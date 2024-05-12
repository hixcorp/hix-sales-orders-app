import json
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from typing import List
import asyncio
from datetime import datetime, timedelta
from db_management import UserInput, get_current_db_url, get_currentdb, get_currentengine 

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

last_checked = datetime.now()

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
        # Check every 10 seconds
        await asyncio.sleep(10) 
         # Update the database if it has changed
        if engine.url != get_current_db_url():
            db = get_currentdb()
            engine = get_currentengine()
        #     print(f'SWITCHING DATABASES')
        # print(f'ENGINE URL: {engine.url}\nCURRENT URL:{get_current_db_url()}')
        
        if(db):
            # print('checking db for updates')
            # print(f'Last Checked: {last_checked.isoformat()}')
            recent_changes = db.query(UserInput).filter(UserInput.last_updated > last_checked)
            # recent_changes = await db.execute(select(UserInput).where(UserInput.last_updated > last_checked))
            results = recent_changes.all()
            if results:
                await manager.broadcast(json.dumps(jsonable_encoder(results),indent=4))
                last_checked = datetime.now()+ timedelta(hours=5)


