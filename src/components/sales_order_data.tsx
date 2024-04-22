'use client';
import React, { useContext, useState, useMemo, FormEventHandler, FormEvent } from 'react';
import { ColumnSettings, SalesData, SalesDataContext, SalesSettings } from '@/app/salesdata_provider';
import { TableHead, TableRow, TableHeader, TableBody, Table, TableCell } from "@/components/ui/table"
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from './ui/button'
import { CheckedState } from '@radix-ui/react-checkbox';

const SalesOrderData: React.FC = () => {
    const [editing, setEditing] = useState(false);
    const {
        sales_data,
        settings,
        loading,
        update_sales_settings,
        post_sales_settings,
        get_sales_settings
    } = useContext(SalesDataContext);

    
    // useMemo to compute values only when sales_data changes
    const { total_orders, orders_due_this_week, orders_past_due } = useMemo(() => {
        const ordnoIndex = sales_data.schema.findIndex(item => item === 'ordno1');
        const uniqueOrders = new Set(sales_data.data.map(row => row[ordnoIndex]));
        const dueThisWeek = getThisWeeksOrders(sales_data.data);
        const pastDue = getPastDueOrders(sales_data.data);

        return {
            total_orders: uniqueOrders.size,
            orders_due_this_week: dueThisWeek,
            orders_past_due: pastDue
        };
    }, [sales_data]);

    // Ensures sales_data has the 'schema' property
    if (loading) return <h1 className='flex justify-center text-xl text-blue-500'>Loading...</h1>;
    if (!sales_data || !sales_data.schema.length) return <h1 className='flex justify-center text-xl text-red-600'>No sales data found in database</h1>;

    const handleEditColumns = async () => {    
        if (editing) {
            post_sales_settings();
        }
        setEditing(!editing);
    };

    const handleCancelEdit = async () => {
        get_sales_settings();
        setEditing(false);
    };

    return (
        <>
            <div className='flex justify-between align-center items-center bg-secondary'>
                <div className='flex gap-4 p-2 font-bold items-center'>
                    {/* Display computed values directly */}
                    <span className='flex'>Total Items: <div className='px-2 text-blue-600'>{sales_data.data.length}</div></span>
                    <span className='flex'>Total Orders: <div className='px-2 text-blue-600'>{total_orders}</div></span>
                    <span className='flex'>Total Orders Due this Week: <div className='px-2 text-blue-600'>{orders_due_this_week.length}</div></span>
                    <span className='flex'>Orders Past Due: <div className='px-2 text-blue-600'>{orders_past_due.length}</div></span>
                </div>
                <div className='flex gap-1'>
                    <div className='bg-red-300 p-1 m-0 rounded-md text-sm font-bold'>Past Due</div>
                    <div className='bg-yellow-300 p-1 m-0 rounded-md text-sm font-bold'>Due This Week</div>
                </div>
                <div>
                    {editing && <Button onClick={handleCancelEdit} className='m-0 h-8'>Cancel</Button>}
                    <Button onClick={handleEditColumns} className='m-0 h-8 w-[12ch]'>{editing ? "Save Changes" : "Edit Columns"}</Button>
                </div>
            </div>
            <div className='border overflow-auto'>
            <Table className='text-[9px] p-[0px] m-[0px] text-left align-left'>
                <TableRender editing={editing} sales_data={sales_data} settings={settings} orders_due_this_week={orders_due_this_week} orders_past_due={orders_past_due}/>
            </Table>
            </div>
        </>
    );
};

export default SalesOrderData;

function TableRender({ editing, sales_data, settings, orders_due_this_week, orders_past_due }: { editing: boolean, sales_data: SalesData, settings: SalesSettings, orders_due_this_week: string[], orders_past_due: string[] }) {
    const ordno = sales_data.schema.findIndex(item => item ==='ordno1')  
    let current_order = ''
    let bg = false
    return (
        <>
            <TableHeader className=''>
                <TableRow className='text-[13px] font-extrabold align-left text-left'>
                    {sales_data.schema.map((s, i) => {
                        const s_settings = settings.data.find(item => item.column_name === s);
                        return !editing && s_settings?.hidden ? null : (
                            <TableHead key={`header_${i}`} className='sticky top-0 text-left align-left px-1 bg-secondary w-min max-w-[10ch]'>
                                {s_settings?.display_name || s}
                            </TableHead>
                        );
                    })}
                    <TableHead className='sticky top-0 text-left align-center px-1 bg-secondary w-min max-w-[10ch]'>
                        Alerts
                    </TableHead>
                </TableRow>
                {editing && <EditSalesSettings />}
            </TableHeader>
            <TableBody>
                {sales_data.data.map((r, i) => {
                    const due_this_week = orders_due_this_week.includes(r[ordno as number]) ? <div className='bg-yellow-300 p-1 m-0 rounded-md text-[9px] font-bold'>Due This Week</div> : ""
                    const late = orders_past_due.includes(r[ordno as number]) ? <div className='bg-red-300 p-1 m-0 rounded-md text-[9px] font-bold'>Past Due</div> : ""
                    
                    if (r[ordno] !== current_order) {
                      current_order = r[ordno]
                      bg = !bg
                    }
                    return <TableRow key={`data_row_${i}`} className={`p-0 m-0 text-[9px] ${bg? 'bg-secondary' : ''}`}>
                        {
                        r.map((c, j) => {
                            const s_settings = settings.data.find(item => item.column_name === sales_data.schema[j]);
                            return !editing && s_settings?.hidden ? null : (
                                <TableCell key={`data_cell_${j}`} className='p-0 m-0 text-left pl-2 w-min max-w-[10ch]'>
                                    {c}
                                </TableCell>
                            );
                        })
                        }
                        <TableCell className='flex p-0 m-0 text-left pl-2 '>
                          {due_this_week}
                          {late}
                        </TableCell>
                    </TableRow>
                })}
            </TableBody>
        </>
    );
}


export const EditSalesSettings = () => {

  const stored_data = useContext(SalesDataContext)
  if (JSON.stringify(stored_data.settings) === JSON.stringify({})) {
    return <></>
  }
  const sales_data = stored_data.sales_data as SalesData
  const sales_settings = stored_data.settings as SalesSettings
  const new_settings = JSON.parse(JSON.stringify(sales_settings)) as SalesSettings

  const handleDisplayName = (e:React.ChangeEvent<HTMLInputElement>,c_settings:ColumnSettings) => {
    const c_idx = new_settings.data.findIndex((c: { column_name: string },i: any) => c.column_name === c_settings.column_name)
    new_settings.data[c_idx].display_name = e.target.value
    stored_data.update_sales_settings(new_settings)
  }

  const handleHiddenColumn = (e:CheckedState,c_settings:ColumnSettings) => {
    const c_idx = new_settings.data.findIndex((c: { column_name: string },i: any) => c.column_name === c_settings.column_name)
    new_settings.data[c_idx].hidden = e as boolean
    stored_data.update_sales_settings(new_settings)
  }


  return (
    <TableRow className='py-2'>
        {sales_data.schema.map((s,i)=>{
          const s_settings = sales_settings?.data?.find((item,i)=>item.column_name===s) as ColumnSettings
          return <TableCell key={`edit_cell_${i}`} className='sticky top-11 bg-secondary items-center text-left align-center p-0 m-0 pl-2 pb-2'>
            <strong className='flex items-center text-left gap-1'>Hidden<Checkbox checked={s_settings.hidden} onCheckedChange={(e)=>handleHiddenColumn(e,s_settings)}></Checkbox></strong>
            <label>Column Name: <br></br>
                <strong className='text-blue-300 pl-2'>{s_settings.column_name}</strong>
            </label>
            <br></br> 
            <label className='w-full'>
              Display Name: <br></br>
            <input type='text' className='text-blue-800 pl-2' value={s_settings.display_name} onChange={(e)=>handleDisplayName(e,s_settings)}></input>
            </label>
            
          </TableCell>
        })}
      </TableRow>
  )
}


function getThisWeeksOrders(data:any) {
  const currentDate = new Date(); // current date
  const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  // Map to get unique orders with their ship dates
  const orders = new Map();
  data.forEach((row: (string | number | Date)[]) => {
    orders.set(row[1], new Date(row[0])); // Assuming no two orders with the same number have different dates
  });

  // Filter orders that have a ship date this week and return their numbers
  const thisWeeksOrders = Array.from(orders).filter(([orderNumber, shipDate]) => 
    shipDate >= startOfWeek && shipDate <= endOfWeek
  ).map(([orderNumber]) => orderNumber); // Extract just the order numbers

  return thisWeeksOrders;
}
function getPastDueOrders(data:any) {
  const currentDate = new Date(); // current date
  const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);

  // Map to get unique orders with their ship dates
  const orders = new Map();
  data.forEach((row: (string | number | Date)[]) => {
    orders.set(row[1], new Date(row[0])); // Assuming no two orders with the same number have different dates
  });

  // Filter orders that have a ship date this week and return their numbers
  const thisWeeksOrders = Array.from(orders).filter(([orderNumber, shipDate]) => 
    shipDate <= currentDate
  ).map(([orderNumber]) => orderNumber); // Extract just the order numbers

  return thisWeeksOrders;
}
