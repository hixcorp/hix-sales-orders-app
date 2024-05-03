import React, { useState, useEffect } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Data, store } from '@/store/sales_data_store';
import { useSnapshot } from 'valtio';

const CollapsibleRow = ({ ordno, rows, bg }: { ordno: string, rows: Data[], bg: boolean }) => {
  const [collapsed, setCollapsed] = useState(true);
  const snap_store = useSnapshot(store);
  useEffect(() => {
    // This effect toggles the collapsed state based on the global expand_all state
    if (snap_store.expand_all !== undefined) {
      setCollapsed(!snap_store.expand_all);
    }
  }, [snap_store.expand_all]); // Only re-run the effect if expand_all changes

  const due_this_week = snap_store.orders_due_this_week.includes(ordno) ? (
    <div className='bg-yellow-300 p-1 m-0 rounded-md text-[9px] font-bold text-primary'>Due This Week</div>
  ) : "";

  const late = snap_store.orders_past_due.includes(ordno) ? (
    <div className='bg-red-300 p-1 m-0 rounded-md text-[9px] font-bold text-primary'>Past Due</div>
  ) : "";

  return (
    <>
      <TableRow onClick={() => setCollapsed(prev => !prev)}
                className={collapsed ? 'bg-secondary hover:text-primary' : 'bg-primary text-white hover:text-white hover:bg-primary'}
                >
                  <HeaderCells rows={rows} />
        <TableCell className='flex p-0 m-0 text-left pl-2'>
          {due_this_week}
          {late}
        </TableCell>
      </TableRow>
      {
        (!collapsed) && 
        rows.map((row: Data, index: number) => (
          <TableRow key={`group_row_${index}`}>
            {Object.keys(row).map((c, i) => {
              const c_settings = snap_store.sales_settings.data.find(item => item.column_name === c);
              // if (!snap_store.editing && c_settings?.hidden) return null;
              return (
                <TableCell key={`cell_data_${i}`} className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>
                  {String(row[c]).replaceAll('>','/n')}
                  {/* {order_fields.includes(String(c_settings?.column_name)) ? '' : row[c].replaceAll('>', '\n')} */}
                </TableCell>
              );
            })}
          </TableRow>
        ))
      }
    </>
  );
};

export default CollapsibleRow;

const HeaderCells = ({rows}: {rows:Data[]}) => {

  return (
    Object.keys(rows[0]).map((c: string, i: number) => {          
        return (
          <HeaderCell key={`data_cell_${i}`} row={rows[0]} c={c} />
        );
      })
    )
}

const HeaderCell = ({row, c}:{row:Data, c:string}) => {
  const snap = useSnapshot(row)
  const snap_store = useSnapshot(store)
  const order_fields = ['GroupNamereqshipdtweekly1', 'ordno1', 'cusno1', 'billtoname1', 'shiptoname1', 'HoldStatus1'];
  const c_settings = snap_store.sales_settings.data.find(item => item.column_name === c)

  if (!snap_store.editing && !!c_settings && c_settings.hidden) return <></>

  return (
    <TableCell className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>
      {String(snap[c]).replaceAll('>','/n')}
      {/* {order_fields.includes(String(c_settings?.column_name||c)) ? rows[0][c] : ''} */}
    </TableCell>
  )
}