'use client'
import React, { useState } from 'react';
import { useSnapshot } from 'valtio';
import { store } from '../../store/sales_data_store'; // Adjust this path to where your store is defined
import {  Table } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import TableRender from './table_render';


const SalesOrderData: React.FC = () => {
    const snap = useSnapshot(store);
    
    const ordnoIndex = snap.sales_data.schema.findIndex(item => ['ordno1','ord_no'].includes(item));
    const uniqueOrders = new Set(snap.sales_data.data.map(row => row[ordnoIndex]));
    
    if (snap.loading) return <h1 className='flex justify-center text-xl text-blue-500'>Loading...</h1>;
    if (!snap.sales_data || !snap.sales_data.schema.length) return <h1 className='flex justify-center text-xl text-red-600'>No sales data found in database</h1>;

    const handleEditColumns = async () => {    
        if (store.editing) {
            store.postSettings();
        }
        store.editing = !store.editing
    };

    const handleCancelEdit = async () => {
        store.fetchSettings();
        store.editing = false
    };

    const toggleViewMode = () => {
      store.table_view = store.table_view !== 'item' ? 'item' : 'order'
    }

    return (
        <>
            <div className='flex justify-between align-center items-center bg-secondary'>
                <div className='flex gap-4 p-2 font-bold items-center'>
                    <span className='flex'>Total Items: <div className='px-2 text-blue-600'>{snap.sales_data.data.length}</div></span>
                    <span className='flex'>Total Orders: <div className='px-2 text-blue-600'>{uniqueOrders.size}</div></span>
                    <span className='flex'>Total Orders Due this Week: <div className='px-2 text-blue-600'>{snap.orders_due_this_week.length}</div></span>
                    <span className='flex'>Orders Past Due: <div className='px-2 text-blue-600'>{snap.orders_past_due.length}</div></span>
                </div>
                <div className='flex gap-1'>
                    <Button className='m-0 h-8' onClick={toggleViewMode}>{snap.table_view === 'item' ? 'Switch to Order View' : 'Switch to Item View'}</Button>
                </div>
                <div>
                    {snap.editing && <Button onClick={handleCancelEdit} className='m-0 h-8'>Cancel</Button>}
                    <Button onClick={handleEditColumns} className='m-0 h-8 w-[12ch]'>{snap.editing ? "Save Changes" : "Edit Columns"}</Button>
                </div>
            </div>
            <div className='border overflow-auto'>
            <Table className='text-[9px] p-[0px] m-[0px] text-left align-left'>
                <TableRender/>
            </Table>
            </div>
        </>
    );
};

export default SalesOrderData;

