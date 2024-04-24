'use client'
import React, {useState} from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store/sales_data_store';
import CollapsibleRow from './collapsible_row';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ItemRow } from './item_view';
import { TableRow } from '../ui/table';

export default function OrderView() {
    const snap = useSnapshot(store);
    const ordnoIndex = snap.sales_data.schema.findIndex(item => ['ordno1','ord_no'].includes(item));
    
    // Group data by order number
    const groupedData  = store.sales_data.data.reduce((acc: any, row) => {
        const ordno = row[ordnoIndex];
        if (!acc[ordno]) {
            acc[ordno] = [];
        }
        acc[ordno].push(row);
        return acc;
    }, {});

    // const snap_grouped_data = useSnapshot(groupedData)
    console.log({groupedData, })
    return (
        <>
            {Object.keys(groupedData).map(ordno => {
                // <CollapsibleGroup key={ordno} groupData={groupedData[ordno]} ordno={ordno} editing={editing} />
                let current_order = ''
                let bg = false
                const due_this_week = snap.orders_due_this_week.includes(ordno) ? <div className='bg-yellow-300 p-1 rounded-md font-bold'>Due This Week</div> : "";
                const late = snap.orders_past_due.includes(ordno) ? <div className='bg-red-300 p-1 rounded-md font-bold'>Past Due</div> : "";

                if (ordno !== current_order) {
                    current_order = ordno;
                    bg = !bg;
                }

                // return <CollapsibleRow ordno={ordno} row={groupedData[ordno]} />
                return <CollapsibleRow ordno={ordno} rows={groupedData[ordno]} bg={bg}/>
                // return(
                //     <>

                //     </>
                // )

            })}
        </>
    );
}

// const CollapsibleRow = ({ordno, rows, bg}:{ordno:string, rows:string[][], bg:boolean}) => {
//     const [open, setOpen] = useState(false)
//     // const snap = useSnapshot(rows)
//     console.log({rows})
//     return(
//         <>        <Collapsible 
//             open={open}
//             onOpenChange={setOpen}
//             className='w-full'
//         >
//             <CollapsibleTrigger>
//                 <TableRow>{ordno}</TableRow>
//             </CollapsibleTrigger>
//             <CollapsibleContent>
//                 {
//                     Array.from(Array(rows).keys()).map(i=>{
//                         return <ItemRow ordno={ordno} row={rows[i]} bg={bg}/>
//                     })
//                 }
                
//             </CollapsibleContent>

//         </Collapsible>
//         </>
//     )
//}