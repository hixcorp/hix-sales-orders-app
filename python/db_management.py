# db_mgmt.py
from sqlalchemy import DateTime, create_engine, Column, Integer, String, Boolean, func, select, update
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

from utils import get_base_directory

from settings import *

Base = declarative_base()

DATABASE_NAME = 'local_dbV1.db'
BASE_DIR = get_base_directory()
LOCAL_DATABASE = f'sqlite:///{os.path.join(BASE_DIR,DATABASE_NAME)}'

global LOCAL_ENGINE, LOCAL_SESSION, CURRENT_ENGINE, CURRENT_SESSION

timenow = lambda: func.now().op('AT TIME ZONE')('UTC')

class AllowedInput(Base):
    __tablename__ = 'allowed_inputs'
    id = Column(Integer, primary_key=True)
    type = Column(String, nullable=False)  # 'order_status' or 'action_owner'
    value = Column(String, nullable=False)

class UserInput(Base):
    __tablename__ = 'user_input'
    id = Column(String, primary_key=True, default="")
    order_status = Column(String, default="")
    additional_info = Column(String, default="")
    action = Column(String, default="")
    action_owner = Column(String, default="")
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(String, default="")


class SavedDatabase(Base):
    __tablename__ = 'saved_databases'
    id = Column(Integer, primary_key=True)
    name = Column(String, default="", unique=True)
    path = Column(String, unique=True)
    preferred = Column(Boolean, default=False)

def seed_allowed_inputs(session):
    db_session = session()
    try:
        # Create default status entries
        default_statuses = [
            'NOT PAID', 'CANCELLED', 'CTA', 'CUSTOMER PICKUP', 'DID NOT SHIP',
            'DROP SHIP', 'ENG APPROVAL', 'NEEDS CORRECTED', 'NEEDS INFO',
            'NOT COMPLETE', 'NOT RELEASED', 'OUT OF STOCK',
            'SALES / APPROVAL', 'SHIPPED',
        ]
        default_action_owners = [
            'Sales', 'Engineering', 'Finance', 'Accounting',
            'Shipping', 'Inventory', 'Purchasing', 'Operations', 'Marketing', 'IT'
        ]

        # Check existing entries to avoid duplicates
        existing_entries = db_session.query(AllowedInput).all()
        existing_statuses = {entry.value for entry in existing_entries if entry.type == 'order_status'}
        existing_owners = {entry.value for entry in existing_entries if entry.type == 'action_owner'}

        # Add new statuses if they don't exist
        for status in default_statuses:
            if status not in existing_statuses:
                db_session.add(AllowedInput(type='order_status', value=status))

        # Add new action owners if they don't exist
        for owner in default_action_owners:
            if owner not in existing_owners:
                db_session.add(AllowedInput(type='action_owner', value=owner))

            db_session.commit()
    finally:
        db_session.close()


def create_engine_with_url(url):
    return create_engine(url, connect_args={"check_same_thread": False})

def create_sessionmaker(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db(engine):
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        local_db = session.execute(select(SavedDatabase).where(SavedDatabase.name == str('Local Database'))).scalar_one_or_none()
        if not local_db:
            local_db = SavedDatabase(name="Local Database", path=str(engine.url), preferred=True)
            session.add(local_db)
            session.commit()
        set_current_database(session)

def set_current_database(session):
    global CURRENT_ENGINE, CURRENT_SESSION, LOCAL_SESSION
    preferred_db = session.execute(select(SavedDatabase).where(SavedDatabase.preferred == True)).scalar_one_or_none()
    # If no preferred set, default to local
    if not preferred_db:
        preferred_db = session.execute(select(SavedDatabase).where(SavedDatabase.path == str(LOCAL_ENGINE.url))).scalar_one()
    if preferred_db.path != str(CURRENT_ENGINE.url):
        if CURRENT_ENGINE != LOCAL_ENGINE:
            CURRENT_ENGINE.dispose()
        CURRENT_ENGINE = create_engine_with_url(preferred_db.path)
        CURRENT_SESSION = create_sessionmaker(CURRENT_ENGINE)
        Base.metadata.create_all(CURRENT_ENGINE)
    seed_allowed_inputs(CURRENT_SESSION)

def update_current_database(database_to_use: SavedDatabase):
        # Update the current engine and session
    global CURRENT_ENGINE, CURRENT_SESSION
    if CURRENT_ENGINE.url != database_to_use.path:
        if CURRENT_ENGINE != LOCAL_ENGINE:
            CURRENT_ENGINE.dispose()
        CURRENT_ENGINE = create_engine_with_url(database_to_use.path)
        CURRENT_SESSION = create_sessionmaker(CURRENT_ENGINE)
        Base.metadata.create_all(CURRENT_ENGINE) 
    seed_allowed_inputs(CURRENT_SESSION)

def get_local_db():
    db = LOCAL_SESSION()
    try:
        yield db
    finally:
        db.close()

def get_current_db():
    db = CURRENT_SESSION()
    try:
        yield db
    finally:
        db.close()

def get_local_db_engine():
    global LOCAL_ENGINE, LOCAL_DATABASE, LOCAL_SESSION
    try:
        yield LOCAL_ENGINE
    except:
        try: LOCAL_ENGINE.dispose()
        except: pass
        start_db()
        yield LOCAL_ENGINE

def get_current_db_engine():
    global CURRENT_ENGINE
    try:
        yield CURRENT_ENGINE
    except:
        get_local_db_engine()

def start_db():
    global LOCAL_ENGINE, LOCAL_DATABASE, LOCAL_SESSION, CURRENT_ENGINE, CURRENT_SESSION
    LOCAL_ENGINE = create_engine_with_url(LOCAL_DATABASE)
    LOCAL_SESSION = create_sessionmaker(LOCAL_ENGINE)
    CURRENT_ENGINE = LOCAL_ENGINE
    CURRENT_SESSION = LOCAL_SESSION
    init_db(LOCAL_ENGINE)
    print(f"Starting local database at {LOCAL_ENGINE.url}")
    print(f"Starting current database at {CURRENT_ENGINE.url}")
    

if __name__ == '__main__':
    start_db()
