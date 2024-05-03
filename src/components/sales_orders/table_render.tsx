import React, { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Data, store } from '@/store/sales_data_store';
import { TableHead, TableRow, TableHeader, TableBody, TableCell } from "@/components/ui/table";
import { EditSalesSettings } from './edit_sales_settings'; 
import ItemView from './item_view';
import OrderView from './order_view';

export default function TableRender() {
    const snap = useSnapshot(store);
    return (
        <>
            <TableHeader>
                <TableRow className='text-[13px] font-extrabold align-left text-left'>
                    <HeaderCells/>
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

const HeaderCells = ()=>{

    return(
        Object.keys(store.sales_data.data[0]).map((c, i) => 
            (
                <HeadCell key={`header_${i}`} c={c} />
            ))
        )
}

const HeadCell = ({c}:{c: string}) => {

    const snap_store = useSnapshot(store)
    const c_settings = snap_store.sales_settings.data.find(item => item.column_name == c)

    if (!snap_store.editing && !!c_settings && c_settings.hidden) return <></>

    return (
        <TableCell className='sticky top-0 px-1 bg-secondary'>
            {c_settings?.display_name || c}
        </TableCell>
    )
}