import pyodbc
import json
from decimal import Decimal
from datetime import datetime
import utils
import polars as pl
from db_conn import conn_str, hg_order_by_req_ship
from mssql import MSSQLConnector, CustomEncoder
    
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

def get_all_items_on_order(conn_str: str):
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

        # Establish a new cursor for comments fetching specific to each order and line sequence
        comment_query = f'''SELECT "line_seq_no", "cmt_seq_no", "cmt" FROM "001"."dbo"."oelincmt_sql" WHERE "ord_no"='{r['ord_no']}' ORDER BY "line_seq_no", "cmt_seq_no"'''
        cursor.execute(comment_query)
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
    data = json.loads(json_results)
    
    
    return json_results



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

if __name__ == '__main__':

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

        # Establish a new cursor for comments fetching specific to each order and line sequence
        comment_query = f'''SELECT "line_seq_no", "cmt_seq_no", "cmt" FROM "001"."dbo"."oelincmt_sql" WHERE "ord_no"='{r['ord_no']}' ORDER BY "line_seq_no", "cmt_seq_no"'''
        cursor.execute(comment_query)
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
    print(json_results)
    data = json.loads(json_results)

    df = pl.DataFrame(data)

    database_file = 'MSSQL_output.db'
    utils.store_to_sqlite(df, database_file)
    print(df)

