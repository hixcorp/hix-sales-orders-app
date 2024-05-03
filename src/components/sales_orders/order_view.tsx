'use client'
import React from 'react';
// import { useSnapshot } from 'valtio';
import { store } from '@/store/sales_data_store';
import CollapsibleRow from './collapsible_row';

export default function OrderView() {
    // const snap = useSnapshot(store);
    
    // Group data by order number
    const groupedData  = store.sales_data.data.reduce((acc: any, row) => {
        const ordno = row?.ord_no;
        if (!acc[ordno]) {
            acc[ordno] = [];
        }
        acc[ordno].push(row);
        return acc;
    }, {});
    return (
        <>
            {Object.keys(groupedData).map(ordno => {
                let current_order = ''
                let bg = false

                if (ordno !== current_order) {
                    current_order = ordno;
                    bg = !bg;
                }
                return <CollapsibleRow key={ordno} ordno={ordno} rows={groupedData[ordno]} bg={bg}/>
            })}
        </>
    );
}
