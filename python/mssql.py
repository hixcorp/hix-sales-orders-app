import pyodbc
import json
from decimal import Decimal
from datetime import datetime
import utils
import polars as pl
from db_conn import conn_str, hg_order_by_req_ship, comment_query, all_comments, all_items

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


def get_all_items():
    global conn_str
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
    return {"data":data, "schema": columns}
    # df = pl.DataFrame(data)

    # database_file = 'MSSQL_output.db'
    # utils.store_to_sqlite(df, database_file)
    # print(df)

