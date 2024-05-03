'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import {  Data, store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table";

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
    
    const due_this_week = snap_store.orders_due_this_week.includes(String(ordno)) ? <div className='bg-yellow-300 p-1 rounded-md font-bold'>Due This Week</div> : "";
    const late = snap_store.orders_past_due.includes(String(ordno)) ? <div className='bg-red-300 p-1 rounded-md font-bold'>Past Due</div> : "";
    
    return(
        <TableRow  className={`p-0 ${bg ? 'bg-secondary' : ''}`}>
            {Object.keys(snap).map((key:string,i:number)=>{

                return(
                    <ItemCell row={row} item_key={key} idx={i} key={`data_cell_${i}`} />
                )
            })}
            <TableCell className='flex p-0 pl-2'>{due_this_week}{late}</TableCell>
        </TableRow>
    )
}

const ItemCell = ({row, item_key, idx}:{row:Data, item_key:string, idx:number}) =>{
    const snap = useSnapshot(row)
    const snap_store = useSnapshot(store)
    const c_settings = snap_store.sales_settings.data.find(item => item.column_name === item_key)

    if (!snap_store.editing && c_settings?.hidden) return<></>
    
    return(
        <TableCell key={`data_cell_${idx}`} className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>{snap[item_key]}</TableCell>
    )
}