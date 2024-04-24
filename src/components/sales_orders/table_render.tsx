import React from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store/sales_data_store';
import { TableHead, TableRow, TableHeader, TableBody } from "@/components/ui/table";
import { EditSalesSettings } from './edit_sales_settings'; 
import ItemView from './item_view';
import OrderView from './order_view';

export default function TableRender() {
    const snap = useSnapshot(store);
    return (
        <>
            <TableHeader>
                <TableRow className='text-[13px] font-extrabold align-left text-left'>
                    {snap.sales_data.schema.map((s, i) => {
                        const s_settings = snap.sales_settings.data.find(item => item.column_name === s);
                        return !snap.editing && s_settings?.hidden ? null : (
                            <TableHead key={`header_${i}`} className='sticky top-0 px-1 bg-secondary'>
                                {s_settings?.display_name || s}
                            </TableHead>
                        );
                    })}
                    <TableHead className='sticky top-0 px-1 bg-secondary'>Alerts</TableHead>
                </TableRow>
                {snap.editing && <EditSalesSettings />}
            </TableHeader>
            <TableBody>
                {snap.table_view === 'item'
                    ? <ItemView />
                    : <OrderView />}
            </TableBody>
        </>
    );
}
