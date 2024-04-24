'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { CheckedState } from '@radix-ui/react-checkbox';
import {ColumnSettings, SalesSettings} from '@/store/sales_data_store'

export const EditSalesSettings = () => {
  const snap = useSnapshot(store);

  if (JSON.stringify(snap.sales_settings) === JSON.stringify({})) {
    return <></>;
  }
  
  return (
    <TableRow className='py-2'>
      {Array.from(Array(snap.sales_settings.data.length).keys()).map((i) =>
        <EditCell key={`${snap.sales_settings.data[i].column_name}_${i}`} c_settings={store.sales_settings.data[i]}/>
      )}
    </TableRow>
  );
};

const EditCell = ({c_settings}:{c_settings:ColumnSettings}) => {
  const snap = useSnapshot(c_settings, {sync:true})
  const handleDisplayName = (e: React.ChangeEvent<HTMLInputElement>, c_settings: ColumnSettings) => {
    // Directly modify and trigger updates in the store
    c_settings.display_name = e.target.value;
  };

  const handleHiddenColumn = (e: CheckedState, c_settings: ColumnSettings) => {
    // Directly modify and trigger updates in the store
    c_settings.hidden = e as boolean;
  };

  return(
        <TableCell className='sticky top-11 bg-secondary items-center text-left align-center p-0 m-0 pl-2 pb-2'>
          <strong className='flex items-center text-left gap-1'>Hidden
            <Checkbox checked={c_settings.hidden} onCheckedChange={(e) => handleHiddenColumn(e, c_settings)} />
          </strong>
          <label>Column Name: <br></br>
            <strong className='text-blue-300 pl-2'>{snap.column_name}</strong>
          </label>
          <br></br>
          <label className='w-full'>
            Display Name: <br></br>
            <input type='text' className='text-blue-800 pl-2' value={snap.display_name} onChange={(e) => handleDisplayName(e, c_settings)} />
          </label>
        </TableCell>
  )
}