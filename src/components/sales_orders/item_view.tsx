'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import {  store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table"; // Adjust imports

export default function ItemView() {
    const snap = useSnapshot(store);
    const ordno = snap.sales_data.schema.findIndex(item => ['ordno1','ord_no'].includes(item));
    let current_order = '';
    let bg = false;

    return (
        <>
            {
                Array.from(Array(snap.sales_data.data.length).keys()).map(i=>{
                    const row = store.sales_data.data[i]
                    if (row[ordno] !== current_order) {
                        current_order = row[ordno];
                        bg = !bg;
                    }
                    return <ItemRow key={`data_row_${i}`} ordno={row[ordno]} row={row} bg={bg}/>
                })
            }
        </>
    );
}

export const ItemRow = ({ordno, row, bg}:{ordno:string, row:string[], bg:boolean}) => {
    console.log({row})
    const snap = useSnapshot(row)
    const snap_store = useSnapshot(store)
    
    const due_this_week = snap_store.orders_due_this_week.includes(ordno) ? <div className='bg-yellow-300 p-1 rounded-md font-bold'>Due This Week</div> : "";
    const late = snap_store.orders_past_due.includes(ordno) ? <div className='bg-red-300 p-1 rounded-md font-bold'>Past Due</div> : "";

    return(
        <TableRow  className={`p-0 ${bg ? 'bg-secondary' : ''}`}>
            {Array.from(Array(snap.length).keys()).map(i=>{
                const c_settings = snap_store.sales_settings.data.find(item => item.column_name === snap_store.sales_data.schema[i])

                if (!snap_store.editing && c_settings?.hidden) return<></>

                return(
                    <ItemCell row={row} idx={i} key={`data_cell_${i}`} />
                )
            })}
            <TableCell className='flex p-0 pl-2'>{due_this_week}{late}</TableCell>
        </TableRow>
    )
}

const ItemCell = ({row, idx}:{row:string[], idx:number}) =>{
    const snap = useSnapshot(row)

    // const handleEditRowCell = (e) => {

    // }

    return(
        <TableCell key={`data_cell_${idx}`} className='p-0 pl-2'>{snap[idx]}</TableCell>
    )
}