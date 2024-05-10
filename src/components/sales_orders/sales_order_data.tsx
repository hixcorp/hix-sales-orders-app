'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import { store } from '../../store/sales_data_store'; 
import {  Table } from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import TableRender from './table_render';
import { ComboboxCell } from '../user_input/combobox_input';
import ExportCSV from '../export_csv';
import { Spinner } from '../ui/spinner';

const SalesOrderData: React.FC = () => {
    const snap = useSnapshot(store);
    
    const uniqueOrders = new Set(snap.sales_data.data.map(row => row['ord_no']));
    
    if (snap.loading) return <div className='h-full w-full flex justify-center text-xl '><Spinner size={'large'}/></div>;
    
    return (
        <>
            <div className='p-0 m-0 flex justify-between align-center items-center'>
                <div className='flex gap-4 p-0 m-0 font-bold items-center'>
                    <span className='flex'>Total Items: <div className='px-2 text-blue-600'>{snap.sales_data.data.length}</div></span>
                    <span className='flex'>Total Orders: <div className='px-2 text-blue-600'>{uniqueOrders.size}</div></span>
                    <span className='flex'>Total Orders Due this Week: <div className='px-2 text-blue-600'>{snap.orders_due_this_week.length}</div></span>
                    <span className='flex'>Orders Past Due: <div className='px-2 text-blue-600'>{snap.orders_past_due.length}</div></span>
                </div>
                <ActionButtons/>
            </div>
           
            <div className='border overflow-auto w-full'>
            <Table className='border overflow-auto text-xs p-0 m-0 text-left align-left'>
                <TableRender/>
            </Table>
            </div>
        </>
    );
};

export default SalesOrderData;

const ActionButtons = () => {

    const snap = useSnapshot(store);
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

    const toggleExpandAll = () => {
        store.expand_all = !store.expand_all
    }
return(                
    <>
        <div className='flex gap-1'>
            
            <Button className='m-0 h-8' onClick={toggleViewMode}>{snap.table_view === 'item' ? 'Switch to Order View' : 'Switch to Item View'}</Button>
            {snap.table_view === 'order' && <Button className='m-0 h-8' onClick={toggleExpandAll}>{snap.expand_all ? 'Collapse All' : 'Expand All'}</Button>}
        </div>
        <ExportCSV/>
        <div>
        {snap.editing && <Button onClick={handleCancelEdit} className='m-0 h-8'>Cancel</Button>}
        <Button onClick={handleEditColumns} className='m-0 h-8 w-[12ch]'>{snap.editing ? "Save Changes" : "Edit Columns"}</Button>
        </div>
    </>

)
}