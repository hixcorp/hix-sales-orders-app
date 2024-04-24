import React, {useState} from 'react'
import { TableRow, TableCell } from '@/components/ui/table'
import { SalesData, SalesSettings, store } from '@/store/sales_data_store'
import { useSnapshot } from 'valtio';

const CollapsibleRow = ({ordno, rows, bg}:{ordno:string, rows:string[][], bg:boolean}) => {
  console.log({rows, first: rows[0]})
  const [collapsed, setCollapsed] = useState(true);
  const snap_store = useSnapshot(store)

  const due_this_week = snap_store.orders_due_this_week.includes(ordno) ? <div className='bg-yellow-300 p-1 m-0 rounded-md text-[9px] font-bold text-primary'>Due This Week</div> : ""
  const late = snap_store.orders_past_due.includes(ordno) ? <div className='bg-red-300 p-1 m-0 rounded-md text-[9px] font-bold text-primary'>Past Due</div> : ""
  // const order_fields = ['GroupNamereqshipdtweekly1','ordno1', 'shiptoname1','HoldStatus1']
    const order_fields = ['GroupNamereqshipdtweekly1','ordno1','cusno1','billtoname1', 'shiptoname1','HoldStatus1']
  return (
      <>
      <TableRow onClick={() => setCollapsed(!collapsed)} className={collapsed ? 'bg-secondary hover:text-primary' : 'bg-primary text-white hover:text-white hover:bg-primary'}>
          {rows[0].map((c:string, i:number)=>{
            const c_settings = snap_store.sales_settings.data.find(item => item.column_name === snap_store.sales_data.schema[i])
            if (!snap_store.editing && c_settings?.hidden) return <></>
            console.log({c_settings,c,i})
            return(
            <TableCell key={`data_cell_${i}`} className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>
                  {order_fields.includes(String(c_settings?.column_name)) ? c : ''}
            </TableCell>
            
          )
          })}
          <TableCell className='flex p-0 m-0 text-left pl-2 '>
            {due_this_week}
            {late}
          </TableCell>
      </TableRow>
      {
        !collapsed && rows.map((row:string[], index:number) => (  
          <TableRow key={`group_row_${index}`}>
            {row.map((c,i)=>{
              const c_settings = snap_store.sales_settings.data.find(item => item.column_name === snap_store.sales_data.schema[i])
              if (!snap_store.editing && c_settings?.hidden) return <></>
              return( 
              <TableCell>
                {order_fields.includes(String(c_settings?.column_name)) ? '' : c}
              </TableCell>
              )
            })}
          </TableRow>
        ))
      }
    
    </>
  )
}

export default CollapsibleRow


const CollapsibleGroup = ({ groupData, ordno, editing, sales_data, settings, due_this_week, late }:{groupData:any, ordno:string, editing:boolean, sales_data: SalesData, settings: SalesSettings,due_this_week: React.ReactNode, late: React.ReactNode}) => {
  const [collapsed, setCollapsed] = useState(true);
  const order_fields = ['GroupNamereqshipdtweekly1','ordno1','cusno1','billtoname1', 'shiptoname1','HoldStatus1']
 
  return (
    <>
      <TableRow onClick={() => setCollapsed(!collapsed)} className={collapsed ? 'bg-secondary hover:text-primary' : 'bg-primary text-white hover:text-white hover:bg-primary'}>
        {/* <TableCell>{ordno} - Click to {collapsed ? 'expand' : 'collapse'}</TableCell> */}
        {groupData[0].map((c:string, j: number)=>{
                
                const s_settings = settings.data.find((item: { column_name: any }) => item.column_name === sales_data.schema[j])
                return !editing && s_settings?.hidden ? null : (
                    <TableCell key={`data_cell_${j}`} className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>
                        {order_fields.includes(String(s_settings?.column_name)) ? c : ''}
                    </TableCell>
                );
        })}
        <TableCell className='flex p-0 m-0 text-left pl-2 '>
            {due_this_week}
            {late}
          </TableCell>
      </TableRow>
      {!collapsed && groupData.map((row:string[], index:number) => (
        <TableRow key={`group_row_${index}`}>
          {
            row.map((c, j) => {
                const s_settings = settings.data.find((item: { column_name: any }) => item.column_name === sales_data.schema[j]);
                return !editing && s_settings?.hidden ? null : (
                    <TableCell key={`data_cell_${j}`} className='p-0 m-0 text-left pl-2 w-min max-w-[15ch]'>
                        {/* {c} */}
                        {order_fields.includes(String(s_settings?.column_name)) ? '' : c}
                    </TableCell>
                );
            })
          }
        </TableRow>
      ))}
    </>
  );
};