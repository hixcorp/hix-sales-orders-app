from fastapi import WebSocket, WebSocketDisconnect
from typing import List

import asyncio
from sqlalchemy.future import select
from datetime import datetime, timedelta

from db_management import UserInput

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

async def check_for_changes(engine):
    global last_checked
    while True:
        await asyncio.sleep(10)  # Check every 10 seconds
        async with engine.connect() as conn:
            recent_changes = await conn.execute(select(UserInput).where(UserInput.last_modified > last_checked))
            results = recent_changes.scalars().all()
            if results:
                await manager.broadcast(f"Updated records: {results}")
                last_checked = datetime.now(datetime.utc)

@app.websocket("/ws/user_inputs")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # You can process messages here if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_for_changes())
