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

# Function to convert XML file to JSON
def convert_xml_to_json(file_path: str) -> Optional[str]:
    if not file_path.endswith('.xml'):
        print("Error: File is not an XML file.")
        return None
    
    try:
        # Open and read the XML file
        with open(file_path, 'r', encoding='utf-8') as file:
            xml_data = file.read()
            # Parse the XML into a dictionary
            data_dict = xmltodict.parse(xml_data)
            # Convert dictionary to JSON
            json_data = json.dumps(data_dict, indent=4)
            data = json.loads(json_data)
            return data
    except Exception as e:
        print(f"An error occurred: {e}")
        # return None
        raise Exception
    
def get_xml_report_data(data: dict[str,Any],search_key:str=None, search_value:str=None,find_first:bool=True,depth=-1, exact=True):
    queue_depth = 0
    queue = [{"current":data, "idx":None}]
    found_items = []
    
    while len(queue) > 0:
        
        item = queue.pop(0)
        current = item['current']
        idx = item['idx']
        if current is not None:
            if isinstance(current,list):
                if depth > 0 and queue_depth >= depth:
                        if len(found_items) > 0:
                            # return found_items
                            continue
                for i,v in enumerate(current):
                    queue.append({
                        'current': v,
                        'idx':i
                })
                continue
            for key in current:
                if key.startswith("_") or callable(value:=current[key]):
                    continue #skip private and callable attributes
                key_matches = search_key is None or key == search_key
                similar = False
                if not exact:
                    if isinstance(value,str) and isinstance(search_value,str):
                        similar = search_value in value

                value_matches = search_value is None or value == search_value if exact else similar

                if key_matches and value_matches:
                    found_items.append({
                        "search_key": key,
                        "value": value,
                        "item": current
                    })
                    if find_first: return found_items
                    
                if isinstance(value, list):
                    if depth > 0 and queue_depth >= depth:
                        if len(found_items) > 0:
                            # return found_items
                            continue
                    for array_index, val in enumerate(value):
                        queue.append({
                            "current":val,
                            "idx": array_index,
                        })
                elif isinstance(value,dict):
                    if depth > 0 and queue_depth >= depth:
                        if len(found_items) > 0:
                            # return found_items
                            continue
                    queue.append({
                        'current': value,
                        'idx':None
                    })
                else:
                    # print(f"Skipping key {key}")
                    continue
        queue_depth += 1
    return found_items

    #  search the dictionary for the @Type = 'Report' field

def create_dataframe_from_xml_result(data):
    #Extract the header and value for each entry in the data
    df_rows = [pl.DataFrame({item['ObjectName']: [item['Value']] for item in row}) for row in data]
    df = pl.concat(df_rows)
    return df

def create_dataframe_from_db_result(column_names, rows):

    # Convert the fetched rows to a Polars DataFrame
    if rows:
        df = pl.DataFrame(rows, schema=column_names)
        # print(df)
        return df
    else:
        print("No data found.")
        return pl.DataFrame([])  # Return an empty DataFrame

# ok the last thing I need is a function called upload_xml() that opens a file browser so the user can select an .xml file, which will then be 
def convert_datetime(df:pl.DataFrame):
    return df.with_columns(pl.col('GroupNamereqshipdtweekly1').str.strptime(pl.Date,format='%m/%d/%y').cast(pl.Datetime).alias('GroupNamereqshipdtweekly1'))

def add_uuid_column(df: pl.DataFrame) -> pl.DataFrame:
    # Generate a UUID for each row in the DataFrame
    uuids = [str(uuid.uuid4()) for _ in range(df.height)]
    
    # Add the UUIDs as a new column to the DataFrame
    df = df.with_columns(pl.Series("UUID", uuids))
    
    return df

def add_status_column(df: pl.DataFrame) -> pl.DataFrame:
    # Generate a default status for each row in the DataFrame
    default_status = ['pending' for _ in range(df.height)]
    
    # Add the status as a new column to the DataFrame
    df = df.with_columns(pl.Series("status", default_status))
    
    return df

def store_to_sqlite(df: pl.DataFrame, db_filename):
    df = add_uuid_column(df=df)
    conn = sqlite3.connect(database=db_filename)
    cursor = conn.cursor()

    #Dynamically create the items tables
    columns = df.columns
    column_types = ['TEXT' if isinstance(dtype, pl.String) or  isinstance(dtype, pl.Datetime) else 'REAL' for dtype in df.dtypes]
    items_table_cols = ', '.join(f'"{col}" {col_type}' for col, col_type in zip(columns,column_types))
    items_table_sql = f'CREATE TABLE IF NOT EXISTS items ({items_table_cols})'
    cursor.execute(items_table_sql)

    #Dynamically create the 'archive' table if it does not exist. 
    # It has all the columns from items plus an 'archived_timestamp"
    archive_columns_sql = f'{items_table_cols}, "archived_timestamp" TEXT'
    archive_table_sql = f'CREATE TABLE IF NOT EXISTS archive ({archive_columns_sql})'
    cursor.execute(archive_table_sql)

    try:
        clear_old_archived_data(db_filename=db_filename)
    except:
        pass

    #Check for existing entries with the same order number (ordno1) and archive items
    ordnos = set(df['ordno1'].to_list())
    for ordno in ordnos:
        # Move existing entries with the same order number to the archive
        cursor.execute('Select * from items WHERE "ordno1" = ?',(ordno,))
        existing_items = cursor.fetchall()
        if existing_items:
            archive_time = datetime.now().isoformat()
            cursor.execute('BEGIN TRANSACTION;')
            for item in existing_items:
                insert_query = 'INSERT INTO archive SELECT *, ? FROM items WHERE "ordno1" = ?'
                cursor.execute(insert_query, (archive_time,ordno))
            cursor.execute('DELETE FROM items WHERE "ordno1" = ?', (ordno,))
            cursor.execute('COMMIT;')

    # Insert new entries from the Dataframe into the 'items' table
    # Connection string for the SQLite database
    conn_string = f'sqlite:///{db_filename}'
    df.write_database(connection=conn_string, table_name='items',if_table_exists='append')

    # Commit changes and close the connections
    conn.commit()
    conn.close()
    print("Data stored into SQLite database")

def write_to_csv(df: pl.DataFrame, filepath:str, include_comments:bool=True):
    try:
        df.write_csv(filepath)
    except:
        raise Exception('Could not create the CSV file')

def clear_old_archived_data(db_filename):
    # Calculate the date 30 days ago from today
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Connect to the SQLite database
    conn = sqlite3.connect(db_filename)
    cursor = conn.cursor()
    
    # SQL statement to delete records from the archive table where the archived timestamp is older than 30 days
    delete_sql = '''
    DELETE FROM archive
    WHERE datetime(archived_timestamp) < datetime(?)
    '''
    
    # Execute the deletion command
    cursor.execute(delete_sql, (thirty_days_ago.isoformat(),))
    
    # Commit the changes to the database
    conn.commit()
        
    # Close the database connection
    conn.close()

def update_status_by_uuid(db_filename, uuid, new_status):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_filename)
    cursor = conn.cursor()

    # SQL statement to update the status of a specific row identified by UUID
    update_sql = '''
    UPDATE items
    SET status = ?
    WHERE UUID = ?
    '''
    # Execute the update command
    cursor.execute(update_sql, (new_status, uuid))

    # Commit the changes to the database
    conn.commit()

    # Close the database connection
    conn.close()

def initialize_item_settings(db_path):
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    # Check if the item table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='items'")
    if not cursor.fetchone():
        # Table does not exist, so initialize it
        print("item table does not exist. Initializing...")
        raise Exception("items table does not exist")

    # Create the item_settings table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS item_settings (
            column_name TEXT PRIMARY KEY,
            hidden BOOLEAN NOT NULL DEFAULT 0,
            display_name TEXT
        )
    ''')
    
    # Check which columns are already configured in item_settings
    cursor.execute("SELECT column_name FROM item_settings")
    existing_columns = set([row[0] for row in cursor.fetchall()])
    
    # Get columns from the items table
    cursor.execute("PRAGMA table_info(items)")
    item_columns = set([row[1] for row in cursor.fetchall() if row[1] not in existing_columns])
    
    # Insert default data for new columns from the items table
    for column in item_columns:
        cursor.execute("INSERT INTO item_settings (column_name, display_name) VALUES (?, ?)", (column, column))
    
    connection.commit()
    connection.close()

def update_item_settings(db_path, settings):
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    # Check if the item_settings table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='item_settings'")
    if not cursor.fetchone():
        # Table does not exist, so initialize it
        print("item_settings table does not exist. Initializing...")
        initialize_item_settings(db_path)
    
    # Prepare update statement
    update_stmt = "UPDATE item_settings SET hidden = ?, display_name = ? WHERE column_name = ?"
    for setting in settings:
        cursor.execute(update_stmt, (setting['hidden'], setting['display_name'], setting['column_name']))
    
    connection.commit()
    connection.close()


def get_item_settings(db_path):
    errors = ''
    try:
        connection = sqlite3.connect(db_path)
        cursor = connection.cursor()

        # Check if the item_settings table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='item_settings'")
        if not cursor.fetchone():
            # Table does not exist, so initialize it
            print("item_settings table does not exist. Initializing...")
            initialize_item_settings(db_path)

        # Fetching all settings from item_settings table
        cursor.execute("SELECT column_name, hidden, display_name FROM item_settings")
        rows = cursor.fetchall()

        # Convert rows to list of dictionaries
        settings_list = [
            {"column_name": row[0], "hidden": bool(row[1]), "display_name": row[2]}
            for row in rows
        ]

        connection.close()
    except Exception as err:
            settings_list = []
            errors = err

    return {"data":settings_list, "errors":errors}


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

def get_items_by_date_range(db_filename, start_date, end_date):
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
        WHERE date_column_name BETWEEN ? AND ?
        '''
        # Execute the query with start and end dates as parameters
        cursor.execute(query_sql, (start_date, end_date))
        
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

def process_xml_file(input_file:str, output_to_csv:bool=False):
    
    # Convert and print the JSON output
    json_output = convert_xml_to_json(input_file)
    if json_output:
        # print(json_output)
        # You can now manipulate `json_output` as a normal JSON object in Python.
        # For example, to load it into a dictionary:
        report_data = get_xml_report_data(json_output, search_key="@Type", search_value="Group", find_first=False,depth=1)
        # Process your JSON data as needed (e.g., for data extraction or further
        # print('done')
        
        all_values = []
        #For the report list (each ship date) get the item details and items for each ship date:
        for idx, item in enumerate(report_data):
            
            header_values = []
            footer_values = []
            item = item['item']
            header = get_xml_report_data(item,search_value='Header',find_first=False)
            header_data = get_xml_report_data(header,search_key='Value',find_first=False, depth=1)
            header_values.extend([v['item'] for v in header_data])
            
            footer = get_xml_report_data(item,search_value='Footer',find_first=False)
            footer_data = get_xml_report_data(footer, search_key='Value', find_first=False, depth=1)
            footer_values.extend([v['item'] for v in footer_data])
            header_values.extend(footer_values)

            details = get_xml_report_data(item, search_value='Details', find_first=False, depth=1)
            for det in details:
                sales_values = []
                values = get_xml_report_data(det['item'], search_key='Value', find_first=False) # depth=1
                values = [v['item'] for v in values]
                # Join comments together:
                comments = [v for v in values if v['ObjectName'] == 'cmt1']
                for item in comments: values.remove(item)
                if len(comments) > 0:
                    _all_comment_values = [comment['Value'] if comment['Value'] else '' for comment in comments ]
                    _all_comment_formatted = [comment['FormattedValue'] if comment['FormattedValue'] else '' for comment in comments]
                    
                    all_comments = comments.pop(0)
                    all_comments['Value'] = '>'.join(_all_comment_values)
                    all_comments['FormattedValue'] = '>'.join(_all_comment_formatted)
                    
                    values.extend([all_comments]) 

                sales_values.extend(header_values)
                sales_values.extend(values)
                for v in sales_values:
                    if v['Value'] is None: v['Value'] = ''
                    if v['FormattedValue'] is None: v['FormattedValue'] = ''

                all_values.append(sales_values)

    df = create_dataframe_from_xml_result(all_values)
    df = add_status_column(df=df)
    if output_to_csv:
        # output_file = os.path.splitext(input_file)[0] + '.csv'
        output_file = input_file.replace('.xml', '.csv')
        write_to_csv(df=df,filepath=output_file)
        
    df = convert_datetime(df=df)    
    return df

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
    data = get_all_items(db_filename="HG_Sales_DB.db")
    df = process_xml_file(input_file='HG_Open_Sales_Orders_by_Req_Ship.xml', output_to_csv=True)
    write_to_csv(df=df, filepath="output.csv")
    store_to_sqlite(df=df,db_filename="HG_Sales_DB.db")