'use client'
import { Data, store } from '@/store/sales_data_store';
import CollapsibleRow from './collapsible_row';

type GroupedData = {
    [key:number|string] : {order_no: string | number, orders: Data[]}
}

export default function OrderView() {
   
    // Group data by order number keeping the same list order in original data list
    const groupedData = store.sales_data.data.reduce((acc:GroupedData, row, index) => {
    const ordNo = row?.ord_no;
    if (!Object.values(acc).some(group => group.order_no === ordNo)) {
        // Only create a new group if one doesn't already exist for this order_no
        acc[index] = { order_no: ordNo, orders: [] };
    }
    // Find the right group by order_no and add the current row
    const key = Object.keys(acc).find(key => acc[key].order_no === ordNo);
    if (key) acc[key].orders.push(row);
    return acc;
}, {});

    return (
        <>
            {Object.keys(groupedData).map(idx => {
                const ordno = groupedData[idx].order_no
                let current_order = ''
                let bg = false

                if (ordno !== current_order) {
                    current_order = String(ordno);
                    bg = !bg;
                }
                return <CollapsibleRow key={`order_collapse_${ordno}`} ordno={String(ordno)} rows={groupedData[idx].orders} bg={bg}/>
            })}
        </>
    );
}
