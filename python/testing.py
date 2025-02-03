
import pyodbc
import json
from decimal import Decimal
from datetime import date, datetime, time, timedelta
import polars as pl
from db_conn import conn_str
from db_conn import all_items_

from db_conn import batch_text

# all_items_ = batch_text


from mssql import MSSQLConnector, CustomEncoder

def get_all_items():

    global conn_str
    
    # Execute the main query
    try:
        mssql = MSSQLConnector(conn_str)
        conn_str = mssql.conn_str
        cnx = pyodbc.connect(conn_str)
        cursor = cnx.cursor()

        # Execute the main query
        cursor.execute(all_items_)
        columns = [column[0] for column in cursor.description]
        results = [
        {col: cast_and_trim(val) for col, val in zip(columns, row)} 
        for row in cursor.fetchall()
    ]
        # Check for type consistency
        check_and_cast_types(results)
        # results = [dict(zip(columns, row)) for row in cursor.fetchall()]

        # Close the connection
        cursor.close()
        cnx.close()

        # Serialize to JSON (if needed)
        json_results = json.dumps(results, indent=4,cls=CustomEncoder)
        print(json_results)
        data = json.loads(json_results)        
        df = pl.DataFrame(data)
        # df.write_csv('HGB_A_P_B_09062024.csv')
        df.write_csv('HIX_FullCycleCount_10_2024.csv')
        
        return {"data":data, "schema": columns}
    except Exception as e:
        print(e)
        cached_data = {}
        if not cached_data["errors"]: cached_data["errors"] = ["Could not connect to source database"]
        return cached_data

def check_and_cast_types(results):
    """Ensure consistent types across all rows for each column."""
    first_row_types = {key: type(value) for key, value in results[0].items()}
    for i, row in enumerate(results):
        for key, value in row.items():
            expected_type = first_row_types[key]
            results[i][key] = cast_and_trim(value, target_type=expected_type)

def check_consistent_types(results):
    """Check if all rows have consistent types with the first row."""
    first_row_types = {key: type(value) for key, value in results[0].items()}
    for i, row in enumerate(results):
        for key, value in row.items():
            if "K" in value:
                print("Value is K")
            if type(value) != first_row_types[key]:
                print(f"Type mismatch in row {i} for column '{key}': Expected {first_row_types[key]}, got {type(value)}")

def cast_and_trim(value, target_type=None):
    """Helper function to cast and trim values, ensuring consistency."""
    if value is None:
        if target_type == str:
            return ""  # Replace None with an empty string for string columns
        elif target_type == float:
            return 0.0  # Replace None with 0.0 for float columns
        elif target_type == int:
            return 0  # Replace None with 0 for int columns
        else:
            return ""  # Default case, keep None
    elif isinstance(value, Decimal):
        return float(value)
    elif isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, date):
        return value.isoformat()
    elif isinstance(value, time):
        return value.isoformat()
    elif isinstance(value, timedelta):
        return str(value)
    elif isinstance(value, bytes):
        return value.decode('utf-8').strip()
    elif isinstance(value, str):
        return value.strip()
    elif isinstance(value, bool):
        return bool(value)
    elif isinstance(value, int):
        return int(value)
    elif isinstance(value, float):
        return float(value)
    else:
        return value  # Default case, return as is

def enforce_schema(results, schema):
    """Ensure all data conforms to the provided schema."""
    for i, row in enumerate(results):
        for key, value in row.items():
            expected_type = schema[key]
            results[i][key] = cast_and_trim(value, target_type=expected_type)

def define_schema(results):
    """Define a schema based on the first row of data."""
    schema = {key: type(value) for key, value in results[0].items()}
    return schema

# def cast_and_trim(value):
#     """Helper function to cast and trim values."""
#     if isinstance(value, Decimal):
#         return float(value)
#     elif isinstance(value, datetime):
#         return value.isoformat()
#     elif isinstance(value, date):
#         return value.isoformat()
#     elif isinstance(value, time):
#         return value.isoformat()
#     elif isinstance(value, timedelta):
#         return str(value)
#     elif isinstance(value, bytes):
#         return value.decode('utf-8').strip()
#     elif isinstance(value, str):
#         return value.strip()
#     elif isinstance(value, bool):
#         return bool(value)
#     elif isinstance(value, int):
#         return int(value)
#     elif isinstance(value, float):
#         return float(value)
#     elif value is None:
#         return None
#     else:
#         return value  # Default case, return as is

if __name__ == "__main__":
    print("Starting up")

    data = get_all_items()
    # print(data)
    print("Got Data")