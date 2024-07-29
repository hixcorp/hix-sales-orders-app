'use client'
import { store } from '@/store/sales_data_store'
import React from 'react'
import { useSnapshot } from 'valtio'
import { Button } from '../ui/button'
import { RefreshCw } from 'lucide-react'
import { isISODateString } from './collapsible_row'

const format_date = (datestr:string) => {
  const is_iso=  isISODateString(datestr)
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
        return (
          <div className='flex items-center justify-center text-xl text-destructive font-extrabold'>
          <h1 className=''>
              No sales data found in database. Check the network connection and try again.
          </h1>
          <Button className='' variant={'secondary'} onClick={()=>{store.fetchData()}}><RefreshCw/>Retry</Button>
        </div>
          )
    }

    return (
    <>
         {snap.sales_data.cached && (snap.sales_data.errors.length > 0 ) && 
            <div className='flex items-center'>       
                <h2 className='text-destructive'>
                    {`WARNING: Could not connect to Macola HIXSQL003 database. Using cached data from ${format_date(snap.sales_data.cache_date)}. Check network connection.`}
                </h2>
                <Button className='' variant={'secondary'} onClick={()=>{store.fetchData()}}><RefreshCw/>Retry</Button>
            </div>
               
            }
            {snap.sales_data.cached && (snap.sales_data.errors.length === 0) && 
            <div className='flex items-center gap-1'>
              <h2>{`Using cached data from ${format_date(snap.sales_data.cache_date)}. Refresh with live data:`} </h2>
              <Button className='h-min w-min' variant={'secondary'} onClick={()=>{store.fetchData(false)}}><RefreshCw size={20}/></Button>
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
