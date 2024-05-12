'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import {  Data, store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table";
import { CircleAlert, CircleX } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { formatDate, getAlerts, isISODateString } from './collapsible_row';

export default function ItemView() {
    const snap = useSnapshot(store);
    let current_order = '';
    let bg = false;

    return (
        <>
            {
                Array.from(Array(snap.sales_data.data.length).keys()).map(i=>{
                    const row = store.sales_data.data[i]
                    if (row['ord_no'] !== current_order) {
                        current_order = String(row['ord_no']);
                        bg = !bg;
                    }
                    return <ItemRow key={`data_row_${i}`} row={row} bg={bg}/>
                })
            }
        </>
    );
}
export const ItemRow = ({row, bg}:{row:Data, bg:boolean}) => {
    const snap = useSnapshot(row)

    return(
        <TableRow  className={`p-0 ${bg ? 'bg-secondary' : ''}`}>
            {Object.keys(snap).map((key:string,i:number)=>{
                return(
                    
                    <ItemCell row={row} item_key={key} idx={i} key={`data_cell_${i}`} />
                )
            })}
            
        </TableRow>
    )
}

const ItemCell = ({row, item_key, idx}:{row:Data, item_key:string, idx:number}) =>{
    const snap = useSnapshot(row)
    const snap_store = useSnapshot(store)
    const c_settings = snap_store.sales_settings[item_key]

    if (!snap_store.editing && c_settings?.hidden) return<></>

    const value = String(snap[item_key]);
    let cellContent: React.ReactNode = isISODateString(value) ? formatDate(value) : value.replaceAll('>', '/n');

    
    //Extra formatting
    let classname = 'flex items-center gap-1'
    let extras:React.ReactNode[] = []

    if (item_key === 'shipping_dt'){
      const {past_due, due_this_week} = getAlerts(snap[item_key])
      
      const past = past_due ? <CircleX className='text-destructive' />: <></>
      const week = due_this_week ? <CircleAlert className='text-yellow-500' />: <></>
      let color = due_this_week ? 'text-yellow-500' : ''
      color = past_due ? 'text-destructive' : color
      
      let font = color? 'font-bold text-xs' : ''

      classname = `${classname} ${color} ${font}`
      extras.push(past)
      extras.push(week)
    }

    if (item_key==='ord_no') {
      classname = `${classname} font-extrabold text-sm`
    }  
    const extra_ui = extras.map((e:React.ReactNode)=>e)

    cellContent = <div className={classname}>{extra_ui}{cellContent}</div>
  
    
    return(
        <TableCell key={`data_cell_${idx}`} className='p-0 m-0 text-left pl-2'>
            {
            flexRender(cellContent, {})
            }
        </TableCell>
    )
}