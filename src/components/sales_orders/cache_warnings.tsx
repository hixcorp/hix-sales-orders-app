'use client'
import { store } from '@/store/sales_data_store'
import React from 'react'
import { useSnapshot } from 'valtio'
import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'
import { isISODateString } from './collapsible_row'

const format_date = (datestr:string) => {
  const is_iso=  isISODateString(datestr)
  console.log({datestr, is_iso})
  if (is_iso){
    const date = new Date(datestr)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }else{
    return datestr
  }
  
}

export const CachedDataNotice = () => {
    const snap = useSnapshot(store)
  if (snap.loading) return <></>
    if (!snap.sales_data || !Object.keys(snap.sales_data.data).length) {
        return <h1 className='flex justify-center text-xl text-red-600'>
            No sales data found in database. Check the network connection and try again.
            </h1>;
    }

    return (
    <>
         {snap.sales_data.cached && (snap.sales_data.errors.length > 0 ) && 
            <div className='flex items-center'>       
                <h2 className='text-destructive'>
                    {`WARNING: Could not connect to Macola HIXSQL003 database. Using cached data from ${format_date(snap.sales_data.cache_date)}. Check network connection.`}
                </h2>
                <Button className='m-3' variant={'secondary'} onClick={()=>{store.fetchData()}}><RefreshCw/>Retry</Button>
            </div>
               
            }
            {snap.sales_data.cached && (snap.sales_data.errors.length === 0) && 
            <div className='flex items-center '>
              <h2>{`Using cached data from ${format_date(snap.sales_data.cache_date)}. Refresh with live data:`} </h2>
              <Button className='m-3' variant={'secondary'} onClick={()=>{store.fetchData(false)}}><RefreshCw/></Button>
              </div>
            }
            
    </>
  )
}

export const CachedDataWarning = () => {
  return (
    <div>CachedDataWarning</div>
  )
}
