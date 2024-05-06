import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Data, store } from '@/store/sales_data_store';
import { useSnapshot } from 'valtio';
import { CircleAlert, CircleX } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import UserInputOrder from '../user_input/user_input_order';
import { UserInputField } from '../user_input/user_input_field';
import HoverTooltip from '../tooltip';

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

  // const due_this_week = snap_store.orders_due_this_week.includes(ordno) ? (
  //   <div className={`p-0 m-0 text-xs font-extrabold gap-2 ${collapsed ? 'text-yellow-500' : 'text-yellow-200'} flex items-center`}><CircleAlert/>Due This Week</div>
  // ) : "";

  // const late = snap_store.orders_past_due.includes(ordno) ? (
  //   <div className='p-0 m-0 text-xs font-extrabold gap-2 text-destructive flex items-center'><CircleX/>Past Due</div>
  // ) : "";

  const expanded_row_fields = store.sales_data.schema.filter(f => !order_fields.includes(f))

  return (
    <>
      <TableRow 
        className={collapsed ? 'bg-secondary hover:text-primary font-bold' : 'bg-accent text-white font-bold hover:text-white hover:bg-primary'}
      >
        <TableCell className='p-0 m-0'>
        <UserInputField row={rows[0]} field='order_status' />
        </TableCell>
        <RowCells row={rows[0]} show_list={order_fields} onClick={()=> setCollapsed(prev => !prev)}/>
        <UserInputOrder row={rows[0]}/>
       
      </TableRow>
      {
        !collapsed && 
        rows.map((row: Data, index: number) => (
          <TableRow key={`group_row_${row?.ord_no||'order'}_${index}`}>
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
          <RowCell key={`data_cell_${c}_${i}`} row={row} c={c} show_list={show_list} onClick={onClick}/>
        );
      })
    )
}

const RowCell = ({row, c,show_list, onClick}:{row:Data, c:string, show_list:string[], onClick?:React.MouseEventHandler<HTMLTableCellElement>}) => {
  const snap = useSnapshot(row)
  const snap_store = useSnapshot(store)
  
  const c_settings = snap_store.sales_settings[c]

  if (!snap_store.editing && !!c_settings && c_settings.hidden) return <></>

  let cellContent: React.ReactNode = '';
  if (show_list.includes(String(c))) {
    const value = String(snap[c]);
    cellContent = isISODateString(value) ? formatDate(value) : value.replaceAll('>', '/n');
  
    //Extra formatting
    let classname = 'flex items-center gap-1'
    let extras:React.ReactNode[] = []

    if (c === 'shipping_dt'){
      const {past_due, due_this_week} = getAlerts(snap[c])
      
      const past = past_due ? 
          <HoverTooltip content="Past Due"><CircleX className='text-destructive' /> </HoverTooltip>
          : <></>
      const week = due_this_week ? 
          <HoverTooltip content="Due this week"><CircleAlert className='text-yellow-500' /></HoverTooltip>
           : <></>
      let color = due_this_week ? 'text-yellow-500' : ''
      color = past_due ? 'text-destructive' : color
      
      let font = color? 'font-bold text-xs' : ''

      classname = `${classname} ${color} ${font}`
      extras.push(past)
      extras.push(week)
    }

    if (c==='ord_no') {
      classname = `${classname} font-extrabold text-sm`
    }  
    const extra_ui = extras.map((e:React.ReactNode)=>e)

    cellContent = <div className={classname}>{extra_ui}{cellContent}</div>
  
  }

  return (
    <TableCell key={`${row?.ord_no || 'order'}_${c}`} className={`max-w-[60ch] p-0 m-0 text-left pl-2 ${onClick ? 'hover:cursor-pointer' :'' }`} onClick={onClick}>
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

export const getAlerts = (date:string | number | Date) => {
  const currentDate = new Date();
  const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  const shipDate = new Date(date)

  const due_this_week = shipDate >= startOfWeek && shipDate <= endOfWeek
  const past_due = shipDate < currentDate

  return {past_due, due_this_week}
}