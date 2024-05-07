'use client'
import React from 'react';
import { useSnapshot } from 'valtio';
import { store } from '@/store/sales_data_store';
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { CheckedState } from '@radix-ui/react-checkbox';
import {ColumnSettings} from '@/store/sales_data_store'

export const EditSalesSettings = () => {
  const columns = Object.keys(store.sales_data.data[0])
  return (
    <TableRow className='sticky top-0 py-2 '>
      <TableCell className='bg-secondary sticky top-11 border-b-2 border-primary'></TableCell>
      {columns.map((c,i) =>
        {
          return <EditCell key={`${c}_${i}`} c={c} />
      }
      )}
      <TableCell className='bg-secondary sticky top-11 border-b-2 border-primary'></TableCell>
      <TableCell className='bg-secondary sticky top-11 border-b-2 border-primary'></TableCell>
      <TableCell className='bg-secondary sticky top-11 border-b-2 border-primary'></TableCell>
    </TableRow>
  );
};

const EditCell = ({c}:{c:string}) => {
  return(
        <TableCell className='sticky top-11 bg-secondary border-b-2 border-primary items-center text-left align-center p-0 m-0 pl-2 pb-2'>
          <Hidden c={c}/>
          <ColumnName c={c} />
          
          <br></br>
          <DisplayName c={c} />
        </TableCell>
  )
}

const Hidden = ({c}:{c:string}) => {

  const snap = useSnapshot(store.sales_settings, {sync:true})
  const c_settings = store.sales_settings[c]

  const handleHiddenColumn = (e: CheckedState, c_settings: ColumnSettings) => {
    c_settings.hidden = e as boolean;
  };

  return(
    <strong className='flex items-center text-left gap-1'>Hidden
            <Checkbox id={`${c_settings.column_name}_checkbox`} checked={snap[c].hidden} onCheckedChange={(e) => handleHiddenColumn(e, c_settings)} />
          </strong>
  )
}

const ColumnName = ({c}:{c:string}) => {

  const snap = useSnapshot(store.sales_settings, {sync:true})
  const c_settings = store.sales_settings[c]

  return(
    <label id={`${c_settings.column_name}_column_name`}>Column Name: <br></br>
      <strong className='text-blue-300 pl-2'>{snap[c].column_name}</strong>
    </label>
  )
}

const DisplayName = ({c}:{c:string}) => {
  const snap = useSnapshot(store.sales_settings, {sync:true})
  const c_settings = store.sales_settings[c]
  const handleDisplayName = (e: React.ChangeEvent<HTMLInputElement>) => {
    c_settings.display_name = e.target.value;
  }

  return(
    <label className='w-full' id={`${c_settings.column_name}_label`}>
      Display Name: <br></br>
      <input id={`${c_settings.column_name}_display_name`} 
             type='text' 
             className='text-blue-800 pl-2' 
             value={snap[c].display_name} 
             onChange={handleDisplayName} 
             />
    </label>
  )
}