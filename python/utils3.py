import shutil
import sys
import sqlite3
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

def set_preferred_database(LOCAL_DATABASE:str, PREFERRED_DATABASE:str):
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(LOCAL_DATABASE)
        cursor = conn.cursor()

        # SQL statement to select items within the specified date range
        # Assume the date column is stored in ISO format (e.g., 'YYYY-MM-DD')
        # Create the item_settings table if it doesn't exist
        default_id = 'preferred'
        default_path = LOCAL_DATABASE  # This should be a controlled variable, not direct user input

        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS saved_databases (
                id TEXT PRIMARY KEY,
                path TEXT
            )
        ''')
        
        query_sql = '''
                SELECT *
                FROM saved_databases
                WHERE id = 'preferred'
                '''
        cursor.execute(query_sql)
        
        if not cursor.fetchone():
            insert_sql = '''
            INSERT INTO saved_databases (id, path) VALUES (?, ?)
            '''
            try:
                cursor.execute(insert_sql, (default_id, default_path))
                conn.commit()  # Make sure to commit the changes to the database
            except Exception as e:
                print(f"An error occurred: {e}")

        # SQL statement to update the status of a specific row identified by UUID
        update_sql = '''
        UPDATE saved_databases
        SET path = ?
        WHERE id = ?
        '''
        # Execute the update command
        cursor.execute(update_sql, (PREFERRED_DATABASE, 'preferred'))
        # Close the database connection
        conn.commit()
        conn.close()
    except Exception as e:
        print(e)
        pass
    

def load_preferred_database(LOCAL_DATABASE:str):
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(LOCAL_DATABASE)
        cursor = conn.cursor()
        # Check if the item_settings table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_databases'")
        if not cursor.fetchone():
            # Table does not exist, so initialize it
            print("saved_databases table does not exist. Initializing...")
            set_preferred_database(LOCAL_DATABASE=LOCAL_DATABASE, PREFERRED_DATABASE=LOCAL_DATABASE)
        
        query_sql = '''
        SELECT *
        FROM saved_databases
        WHERE id = 'preferred'
        '''

        # Execute the query with start and end dates as parameters
        cursor.execute(query_sql)

        # Fetch all rows from the query result
        row = cursor.fetchone()
        if not row:
            set_preferred_database(LOCAL_DATABASE, LOCAL_DATABASE)
            cursor.execute(query_sql)
            row = cursor.fetchone()
        
        # Close the database connection
        conn.close()
    except Exception as e:
        print(e)
        pass
    return row[1]
    
if __name__ == "__main__":
    row = load_preferred_database("HG_Sales_DB.db")
