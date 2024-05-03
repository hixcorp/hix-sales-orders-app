import os
import sys
from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

global DATABASE, CURRENT_ENGINE

def get_current_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_url():
    global DATABASE
    if str(DATABASE).startswith('sqlite:///'):
        return DATABASE
    else:
        if not DATABASE: 
            DATABASE = f'sqlite:///{os.path.join(get_base_directory(),"local_dbV1.db")}'
        return f'sqlite:///{DATABASE}'

def create_engine_with_url(url):
    return create_engine(url, connect_args={"check_same_thread": False})

def create_sessionmaker(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_database_engine():
    global CURRENT_ENGINE, SessionLocal, DATABASE
    url = get_database_url()
    CURRENT_ENGINE.dispose()
    CURRENT_ENGINE = create_engine_with_url(url)
    SessionLocal = create_sessionmaker(engine=CURRENT_ENGINE)

def get_base_directory():
    """ Determine the base directory for data and database files. """
    if getattr(sys, 'frozen', False):
        # Running in a bundle (deployed)
        base_dir = os.path.join(os.getenv('APPDATA'), 'hixcorp', 'data')
    else:
        # Running live (development)
        base_dir = os.getcwd()  # Or any other directory you use in development

    if not os.path.exists(base_dir):
        os.makedirs(base_dir)  # Create the directory if it doesn't exist

  
CURRENT_ENGINE = create_engine_with_url(get_database_url())
SessionLocal = create_sessionmaker(engine=CURRENT_ENGINE)
if not DATABASE: 
    DATABASE = f'sqlite:///{os.path.join(get_base_directory(),"local_dbV1.db")}'
