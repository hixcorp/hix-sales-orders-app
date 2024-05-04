'use client'
import { store } from '@/store/sales_data_store'
import React from 'react'
import { useSnapshot } from 'valtio'
import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'

export const CachedDataNotice = () => {
    const snap = useSnapshot(store)

    if (!snap.loading && !snap.sales_data || !Object.keys(snap.sales_data.data).length) {
        return <h1 className='flex justify-center text-xl text-red-600'>
            No sales data found in database. Check the network connection and try again.
            </h1>;
    }

    return (
    <>
         {snap.sales_data.cached && (snap.sales_data.errors.length > 0 ) && 
            <div className='flex items-center'>       
                <h2 className='text-destructive'>
                    WARNING: Could not connect to Macola HIXSQL003 database. Using cached data. Check network connection.
                </h2>
                <Button className='m-3' variant={'secondary'} onClick={()=>{store.fetchData()}}><RefreshCw/>Retry</Button>
            </div>
               
            }
            {snap.sales_data.cached && (snap.sales_data.errors.length === 0) && <h2>Using cached data</h2>}
            
    </>
  )
}

export const CachedDataWarning = () => {
  return (
    <div>CachedDataWarning</div>
  )
}
