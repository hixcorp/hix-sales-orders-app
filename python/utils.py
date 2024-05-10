import shutil
import sys
from sqlalchemy import URL
import xmltodict
import json
from typing import Optional, Any
import polars as pl
import sqlite3
from datetime import datetime, timedelta, timezone
import uuid
import os

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

    return base_dir

def store_to_sqlite(df: pl.DataFrame, db_filename):

    conn = sqlite3.connect(database=db_filename)
    cursor = conn.cursor()

    # Ensure the cache_info table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cache_info (
        last_cache_date TEXT
    )
    """)

    # Drop the existing items table if it exists
    drop_table_sql = "DROP TABLE IF EXISTS items"
    cursor.execute(drop_table_sql)

    # Dynamically create the items tables
    columns = df.columns
    column_types = ['TEXT' if isinstance(dtype, (pl.String, pl.Datetime)) else 'REAL' for dtype in df.dtypes]
    items_table_cols = ', '.join(f'"{col}" {col_type}' for col, col_type in zip(columns, column_types))
    items_table_sql = f'CREATE TABLE IF NOT EXISTS items ({items_table_cols})'
    cursor.execute(items_table_sql)

    # Insert new entries from the Dataframe into the 'items' table
    # Connection string for the SQLite database
    conn_string = f'sqlite:///{db_filename}'
    df.write_database(connection=conn_string, table_name='items',if_table_exists='append')

    

    # Update cache_info table
    cursor.execute("DELETE FROM cache_info")  # Clear existing records
    cursor.execute("INSERT INTO cache_info (last_cache_date) VALUES (?)", (datetime.now(),))
    # Commit changes and close the connections
    conn.commit()
    conn.close()
    print("Data stored into SQLite database")

def write_to_csv(df: pl.DataFrame, filepath:str, include_comments:bool=True):
    try:
        df.write_csv(filepath)
    except:
        raise Exception('Could not create the CSV file')


def get_all_items(db_filename):
    errors = ''
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(db_filename)
        cursor = conn.cursor()

        # SQL statement to select items within the specified date range
        # Assume the date column is stored in ISO format (e.g., 'YYYY-MM-DD')
        query_sql = '''
        SELECT *
        FROM items
        '''

        # Execute the query with start and end dates as parameters
        cursor.execute(query_sql)

        # Fetch all rows from the query result
        rows = cursor.fetchall()
        schema = [d[0] for d in cursor.description]
        # Close the database connection
        conn.close()
    except Exception as err:
        schema = []
        rows = []
        errors = err
    return {"schema": schema, "data": rows, "errors": errors}

def cache_expired(time_delta: float, db_filename: str) -> tuple[bool, str]:
    try:
        # Connect to the database
        conn = sqlite3.connect(db_filename)
        cursor = conn.cursor()

        # # Check if the items table exists
        # cursor.execute("SELECT count(name) FROM sqlite_master WHERE type='table' AND name='items'")
        # if cursor.fetchone()[0] == 0:
        # Check existence of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('items', 'cache_info')")
        tables = {row[0] for row in cursor.fetchall()}
        if 'items' not in tables or 'cache_info' not in tables:
            raise ValueError("No tables in the cache database")  # Table doesn't exist, cache is considered expired

        # Query the first cache_date from the items table
        # cursor.execute("SELECT cache_date FROM items ORDER BY cache_date ASC LIMIT 1")
        # result = cursor.fetchone()
        # if not result:
         # Fetch the last cache date
        cursor.execute("SELECT last_cache_date FROM cache_info LIMIT 1")
        result = cursor.fetchone()
        if not result:
            raise ValueError("No cached data available")  # No entries in table, cache is considered expired

        # Calculate the time difference
        cache_date = datetime.strptime(result[0], "%Y-%m-%d %H:%M:%S.%f")
        current_time = datetime.now()
        allowed_time_diff = timedelta(hours=time_delta)  # Using timedelta for time delta

        # Check if the elapsed time is greater than the time_delta
        expired = (current_time - cache_date) > allowed_time_diff
        return (expired, cache_date.isoformat())
    except Exception as e:
        print(f"An error occurred: {e}")
        return (True, datetime.now().isoformat())  # Any error in fetching data leads to cache considered as expired
    finally:
        # Ensure the database connection is closed
        conn.close()

def export_to_csv(output_file, df:pl.DataFrame):
    write_to_csv(df=df,filepath=output_file)
    
def ensure_utc(dt):
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def normalize_to_utc_midnight(dt: datetime) -> datetime:
    """
    Normalize a datetime object to midnight UTC of the same date.
    """
    # Convert datetime to UTC
    dt_utc = dt.astimezone(timezone.utc)
    # Normalize to midnight UTC
    return datetime(dt_utc.year, dt_utc.month, dt_utc.day, tzinfo=timezone.utc)

def format_if_date(column):
    formatted_column = []
    for value in column:
        try:
            # Try to parse the datetime string to a datetime object
            date_time_obj = datetime.fromisoformat(value)
            # Format to a date-only string
            formatted_column.append(date_time_obj.strftime('%Y-%m-%d'))
        except ValueError:
            # If parsing fails, keep the original value
            formatted_column.append(value)
    return formatted_column

def normsqlitepath(path:str | URL, DATABASE_NAME:str='local_dbv1.db'):
    add_sqlpath = lambda x : f'sqlite:///{x}'
    normpath=path
    if isinstance(normpath, URL): normpath = path.__to_string__()
    
    if normpath.startswith('sqlite:///'):
        return add_sqlpath(os.path.normcase(normpath.replace('sqlite:///','')))
    elif normpath.startswith('sqlite://'):
        # path.replace('sqlite://','sqlite:///')
        # return os.path.normcase(path)
        return add_sqlpath(os.path.normcase(normpath.replace('sqlite://','')))
    else:
        path_parts = os.path.split(normpath)
        if not path_parts[0]:
            raise Exception(f'{normpath} is not a valid file. Provide an absolute path')
        else:
            if len(path_parts[-1].split()) == 1:
                # if not os.path.isfile(normpath):
                #     raise Exception(f'{normpath} is not a valid filepath')
                if not normpath.endswith('.db'):
                    raise Exception(f'{normpath} is not a valid .db Database path')
            else:
                if not os.path.isdir(normpath):
                    raise Exception(f'{normpath} is not a valid directory')
                if not os.path.exists(normpath):
                    os.path.makedirs(normpath, exist_ok=True)
                normpath = os.path.join(normpath, DATABASE_NAME)
            return add_sqlpath(os.path.normcase(normpath))


def clear_temp_directory(directory: str):
    """Clears all files in the specified directory."""
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")

if __name__ == "__main__":
    pass
    # row = load_preferred_database("HG_Sales_DB.db")
    # data = get_all_items(db_filename="HG_Sales_DB.db")
    # df = process_xml_file(input_file='HG_Open_Sales_Orders_by_Req_Ship.xml', output_to_csv=True)
    # write_to_csv(df=df, filepath="output.csv")
    # store_to_sqlite(df=df,db_filename="HG_Sales_DB.db")