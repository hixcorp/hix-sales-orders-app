import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Data, store } from '@/store/sales_data_store';
import { useSnapshot } from 'valtio';
import { CircleAlert, CircleX } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { UserInputOrder } from '../user_input/user_input_header';

// const order_fields = ['GroupNamereqshipdtweekly1', 'ordno1', 'cusno1', 'billtoname1', 'shiptoname1', 'HoldStatus1'];

// const fields = ["ord_no", "shipping_dt", "ord_dt",	"cus_no", "bill_to_name", "hold_fg", 
//                     "item_desc_1", "qty_ordered", "qty_to_ship", "unit_price",	"ord_type", 
//                     "prod_cat",	"mfg_loc", "user_def_fld_3", "oe_po_no", "discount_pct", 
//                     "line_no", "line_seq_no", "ID", "hold_status",	"cmt"]
const order_fields = ["ord_no", "shipping_dt", "ord_dt",	"cus_no", "bill_to_name", "ship_to_name", "hold_fg", 
                    "ord_type", 
                    "prod_cat",	"mfg_loc", "user_def_fld_3", "oe_po_no", "discount_pct", 
                    "hold_status"]

const CollapsibleRow = ({ ordno, rows, bg }: { ordno: string, rows: Data[], bg: boolean }) => {
  const [collapsed, setCollapsed] = useState(true);
  const snap_store = useSnapshot(store);
  useEffect(() => {
    // This effect toggles the collapsed state based on the global expand_all state
    if (snap_store.expand_all !== undefined) {
      setCollapsed(!snap_store.expand_all);
    }
  }, [snap_store.expand_all]); // Only re-run the effect if expand_all changes

  const due_this_week = snap_store.orders_due_this_week.includes(ordno) ? (
    <div className={`p-0 m-0 text-xs font-extrabold gap-2 ${collapsed ? 'text-yellow-500' : 'text-yellow-200'} flex items-center`}><CircleAlert/>Due This Week</div>
  ) : "";

  const late = snap_store.orders_past_due.includes(ordno) ? (
    <div className='p-0 m-0 text-xs font-extrabold gap-2 text-destructive flex items-center'><CircleX/>Past Due</div>
  ) : "";

  const expanded_row_fields = store.sales_data.schema.filter(f => !order_fields.includes(f))

  return (
    <>
      <TableRow 
        className={collapsed ? 'bg-secondary hover:text-primary' : 'bg-accent text-white font-bold hover:text-white hover:bg-primary'}
      >
        <TableCell className='p-0 m-0'>
          <div className='flex flex-col align-middle jutsify-left items-left p-0 py-1 m-0 text-left pl-2 w-40'
          >
          {due_this_week}
          {late}
          </div>
        </TableCell>
        <RowCells row={rows[0]} show_list={order_fields} onClick={()=> setCollapsed(prev => !prev)}/>
        <UserInputOrder row={rows[0]}/>
       
      </TableRow>
      {
        !collapsed && 
        rows.map((row: Data, index: number) => (
          <TableRow key={`group_row_${index}`}>
            <TableCell></TableCell>
            <RowCells row={row} show_list={expanded_row_fields}/>
          </TableRow>
        ))
      }
    </>
  );
};

export default CollapsibleRow;

const RowCells = ({row, show_list, onClick}: {row:Data, show_list: string[], onClick?:React.MouseEventHandler<HTMLTableCellElement>}) => {

  return (
    Object.keys(row).map((c: string, i: number) => {          
        return (
          <RowCell key={`data_cell_${i}`} row={row} c={c} show_list={show_list} onClick={onClick}/>
        );
      })
    )
}

const RowCell = ({row, c,show_list, onClick}:{row:Data, c:string, show_list:string[], onClick?:React.MouseEventHandler<HTMLTableCellElement>}) => {
  const snap = useSnapshot(row)
  const snap_store = useSnapshot(store)
  
  const c_settings = snap_store.sales_settings[c]

  if (!snap_store.editing && !!c_settings && c_settings.hidden) return <></>

  let cellContent = '';
  if (show_list.includes(String(c))) {
    const value = String(snap[c]);
    cellContent = isISODateString(value) ? formatDate(value) : value.replaceAll('>', '/n');
  }
  return (
    <TableCell className={`p-0 m-0 text-left pl-2 ${onClick ? 'hover:cursor-pointer' :'' }`} onClick={onClick}>
      {
        flexRender(cellContent, {})
        }
    </TableCell>
  )
}


export const formatDate = (dateString: string | number | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(); // Formats the date as 'MM/DD/YYYY' by default
};

// Function to check if a string is an ISO 8601 date string
export const isISODateString = (str: string) => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(str);
};
