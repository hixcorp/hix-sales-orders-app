import shutil
import sys
import xmltodict
import json
from typing import Optional, Any
import polars as pl
import sqlite3
from datetime import datetime, timedelta
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

def cache_expired(time_delta: float, db_filename: str) -> bool:
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
            return True  # Table doesn't exist, cache is considered expired

        # Query the first cache_date from the items table
        # cursor.execute("SELECT cache_date FROM items ORDER BY cache_date ASC LIMIT 1")
        # result = cursor.fetchone()
        # if not result:
         # Fetch the last cache date
        cursor.execute("SELECT last_cache_date FROM cache_info LIMIT 1")
        result = cursor.fetchone()
        if not result:
            return True  # No entries in table, cache is considered expired

        # Calculate the time difference
        cache_date = datetime.strptime(result[0], "%Y-%m-%d %H:%M:%S.%f")
        current_time = datetime.now()
        allowed_time_diff = timedelta(hours=time_delta)  # Using timedelta for time delta

        # Check if the elapsed time is greater than the time_delta
        return (current_time - cache_date) > allowed_time_diff
    except Exception as e:
        print(f"An error occurred: {e}")
        return True  # Any error in fetching data leads to cache considered as expired
    finally:
        # Ensure the database connection is closed
        conn.close()


if __name__ == "__main__":
    pass
    # row = load_preferred_database("HG_Sales_DB.db")
    # data = get_all_items(db_filename="HG_Sales_DB.db")
    # df = process_xml_file(input_file='HG_Open_Sales_Orders_by_Req_Ship.xml', output_to_csv=True)
    # write_to_csv(df=df, filepath="output.csv")
    # store_to_sqlite(df=df,db_filename="HG_Sales_DB.db")