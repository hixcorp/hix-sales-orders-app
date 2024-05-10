import os
import sqlite3
import pyodbc
import json
from decimal import Decimal
from datetime import datetime, timedelta

# from main import DateRange
import utils
import polars as pl
from db_conn import conn_str, hg_order_by_req_ship, comment_query, all_comments, all_items

#'MSSQL_output.db'
DATABASE_NAME = 'local_cache_dbv1.db'
BASE_DIR = utils.get_base_directory()
LOCAL_DATABASE = os.path.join(BASE_DIR,DATABASE_NAME)
DATABASE_FILE = LOCAL_DATABASE

class MSSQLConnector():
    name='MSSQL Connector'
    description = 'Connects and manages data on the Microsoft SQL database'

    def __init__(self, conn_str) -> None:
        self.conn_str = conn_str                          

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)  # Convert decimal instances to float
        elif isinstance(obj, datetime):
            return obj.isoformat()  # Convert datetime instances to ISO format string
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)
    
def process_order_status(record):
    """
    Processes the order status based on hold flags and user-defined fields.
    
    Args:
    record (dict): A dictionary representing a single record from the database.
    
    Returns:
    str: The order status description.
    """
    hold_fg = record.get('hold_fg', '')
    user_def_fld_3 = record.get('user_def_fld_3', '')

    if hold_fg is not None: hold_fg = hold_fg.strip()
    if user_def_fld_3 is not None: user_def_fld_3 = user_def_fld_3.strip()

    if hold_fg == "H" and user_def_fld_3 is None:
        return "Acctg Hold, Waiting on Funds-NO Production"
    elif hold_fg == "H" and user_def_fld_3 == "P":
        return "Acctg Hold, Waiting on Funds-Released for Production"
    elif user_def_fld_3 == "A":
        return "Order Complete: Do not ship prior to Req Date"
    elif user_def_fld_3 == "B":
        return "Order Complete: Awaiting Carrier Pick Up"
    elif user_def_fld_3 == "C":
        return "Order Complete: Awaiting Shipping Documents"
    elif user_def_fld_3 == "D":
        return "Order Complete: Awaiting Customer Payment"
    elif user_def_fld_3 == "E":
        return "Order awaiting purchased parts"
    elif user_def_fld_3 == "F":
        return "Order awaiting manufactured parts"
    elif user_def_fld_3 == "G":
        return "Order shipping direct from HIX supplier"
    elif user_def_fld_3 == "H":
        return "Order awaiting engineering release"
    elif user_def_fld_3 == "I":
        return "Order awaiting pending changes/add ons"
    elif user_def_fld_3 == "J":
        return "Order awaiting customer confirmation"
    else:
        return ""


def get_all_items(use_cached:bool=True):
    global conn_str
    expired, cached_date = utils.cache_expired(time_delta=0.10, db_filename=DATABASE_FILE)
    print(f'CONNECTION STRING: {conn_str}')
    print(f"expired: {expired}\ncached_date:{cached_date}")
    if use_cached and not expired:
        cached_data = get_all_cached_items(DATABASE_FILE)
        cached_data['cache_date'] = cached_date
        return cached_data
    # Execute the main query
    try:
        mssql = MSSQLConnector(conn_str)
        conn_str = mssql.conn_str
        cnx = pyodbc.connect(conn_str)
        cursor = cnx.cursor()

        # Execute the main query
        cursor.execute(hg_order_by_req_ship)
        columns = [column[0] for column in cursor.description]
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Append comments to each item in the main results while fetching
        for r in results:
            r['hold_status'] = process_order_status(r)
            r['cmt'] = ''  # Initialize the comment field with an empty string
            for v in r:
                if isinstance(r[v], str): r[v] = r[v].strip()

            # Establish a new cursor for comments fetching specific to each order and line sequence
            cursor.execute(comment_query(r))
            comments = cursor.fetchall()

            # Create a dictionary to hold comments for the current order
            comments_dict = {}
            for line_seq_no, cmt_seq_no, cmt in comments:
                key = (r['ord_no'], line_seq_no)  # Unique key for each order and line sequence
                if key not in comments_dict:
                    comments_dict[key] = cmt.strip()  # Start with the first comment part
                else:
                    comments_dict[key] += '\n' + cmt.strip()  # Append additional comment parts

            # Assign comments to the current item in results if they exist
            current_key = (r['ord_no'], r['line_seq_no'])
            if current_key in comments_dict:
                r['cmt'] = comments_dict[current_key]

        # Close the connection
        cursor.close()
        cnx.close()

        # Serialize to JSON (if needed)
        json_results = json.dumps(results, indent=4,cls=CustomEncoder)
        
        # print(json_results)
        data = json.loads(json_results)
                
        df = pl.DataFrame(data)
        
        utils.store_to_sqlite(df, DATABASE_FILE)

        return {"data":data, "schema": columns, "cached": False, "cache_date":cached_date}
    except Exception as e:
        print(e)
        cached_data = get_all_cached_items(DATABASE_FILE)
        cached_data['cache_date'] = cached_date
        if not cached_data["errors"]: cached_data["errors"] = ["Could not connect to source database"]
        return cached_data
    

def get_all_cached_items(db_filename):
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
        # rows = cursor.fetchall()
        schema = [d[0] for d in cursor.description]
        data = [dict(zip(schema, row)) for row in cursor.fetchall()]
        # Close the database connection
        conn.close()
    except Exception as err:
        schema = []
        rows = []
        errors = err
    return {"schema": schema, "data": data, "errors": errors, "cached":True}

def convert_to_dict(columns: list[str], data: list[any]):
    return [dict(zip(columns, row)) for row in data]
  

def get_filtered_items(columns:list[str], filters:dict[str: str | dict[str,str]], use_cache:bool=True):
    global conn_str 
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()

    query_parts = []
    for col in columns:
        if col in filters:
            filter_val = filters[col]
            if filter_val.__class__.__name__ == 'DateRange': #this is a date range filter
                from_date = filter_val.from_date#.strftime('%Y-%m-%d')
                from_date = utils.normalize_to_utc_midnight(from_date)
                from_date = from_date.strftime('%Y-%m-%d')
                if filter_val.to is not None:
                    to_date = filter_val.to
                    to_date = utils.normalize_to_utc_midnight(to_date)
                    to_date = (to_date + timedelta(days=1)).strftime('%Y-%m-%d')
                    query_parts.append(f"{col} BETWEEN '{from_date}' AND '{to_date}'")
                elif filter_val[['from_date']] is not None:
                    query_parts.append(f"{col} >= '{from_date}'")
                else:
                    pass
            else: #This is a string filter
                query_parts.append(f"{col} LIKE '%{filter_val}'")
    
    where_clause = ' AND '.join(query_parts)
    sql = f"SELECT {', '.join(columns) if columns else '*'} FROM items { f'WHERE {where_clause}' if where_clause else ''}"
    cursor.execute(sql)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    if not data: return data

    if not columns: columns = [d[0] for d in cursor.description]

    results = convert_to_dict(columns, data)
    # Serialize to JSON (if needed)
    json_results = json.dumps(results, indent=4,cls=CustomEncoder)

    return json.loads(json_results)



