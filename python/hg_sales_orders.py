import sqlite3
import pyodbc
import json
from decimal import Decimal
from datetime import datetime
import utils
import polars as pl
from db_conn import conn_str, all_items_
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


