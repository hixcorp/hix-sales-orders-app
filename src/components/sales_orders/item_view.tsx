'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import {  Data, store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table";
import { CircleAlert, CircleX } from 'lucide-react';
import { flexRender } from '@tanstack/react-table';
import { formatDate, isISODateString } from './collapsible_row';

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
                    return <ItemRow key={`data_row_${i}`} ordno={row['ord_no']} row={row} bg={bg}/>
                })
            }
        </>
    );
}

export const ItemRow = ({ordno, row, bg}:{ordno:string | number, row:Data, bg:boolean}) => {
    const snap = useSnapshot(row)
    const snap_store = useSnapshot(store)
    
    const due_this_week = snap_store.orders_due_this_week.includes(String(ordno)) ? 
        <div className={`p-0 m-0 text-xs font-extrabold gap-2 text-yellow-500 flex items-center`}><CircleAlert />Due This Week</div>
    : "";
    const late = snap_store.orders_past_due.includes(String(ordno)) ? 
    <div className='p-0 m-0 text-xs font-extrabold gap-2 text-destructive flex items-center'><CircleX />Past Due</div>
    : "";
    
    return(
        <TableRow  className={`p-0 ${bg ? 'bg-secondary' : ''}`}>
            <TableCell className='flex p-0 pl-2 flex flex-col w-40'>{due_this_week}{late}</TableCell>
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
    const cellContent = isISODateString(value) ? formatDate(value) : value.replaceAll('>', '/n');

    
    return(
        <TableCell key={`data_cell_${idx}`} className='p-0 m-0 text-left pl-2'>
            {
            flexRender(cellContent, {})
            }
        </TableCell>
    )
}