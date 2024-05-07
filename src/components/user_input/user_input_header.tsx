'use client'
import React, { useEffect, useState } from 'react'
import {  TableHead} from '@/components/ui/table'
import { AllowedValue, Data, store } from '@/store/sales_data_store'

import { api_url } from '@/lib/utils'
import { UserInput } from '@/store/sales_data_store'
import { Spinner } from '@/components/ui/spinner'


const fetchUserInput = async () => {
           
            try{
   
                const res = await fetch(`${api_url}/get_all_user_input`)
                const data: UserInput[] = await res.json()
                console.log({data})
                if (data instanceof(Array)) store.user_input = data
            }catch(err){
                console.warn({err})
            }
        }

const get_allowed_values = async (field:string)=>{
        try{
            const res = await fetch(`${api_url}/allowed_inputs/${field}`)
            if (res.ok){
                const allowed_values: AllowedValue[] = await res.json()
                console.log({allowed_values})
                return {[field]:allowed_values}
            }
            
        }catch(err){
            console.warn({err})
            return []
        }
    }

const UserInputHeader = () => {
    const [loading, setLoading] = useState(false)
     useEffect(()=>{
        const get_data = async () => {
            setLoading(true)
            try{
                await fetchUserInput()
                await get_allowed_values("order_status").then(res=>{
                Object.assign(store.allowed_values, res)
                })
                await get_allowed_values("action_owner").then(res=>{
                Object.assign(store.allowed_values, res)
                console.log({res})
                })}
            catch(err){
                console.warn({err})
            }finally{
                setLoading(false)
            }
            
        }
        get_data()
        
    },[])

    


  return (
    <>
     <TableHead  className=' sticky top-0 p-2 h-full gap-1 text-inherit bg-primary font-extrabold'>
        <div className='flex items-center'>
            Additional Info
        {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>
    </TableHead>
     <TableHead  className='bg-primary sticky top-0 p-2 h-full gap-1 text-inherit font-extrabold'>
        <div className='flex items-center'>
            Action
            {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>
    </TableHead>
     <TableHead  className='bg-primary sticky top-0 p-2 h-full gap-1 text-inherit font-extrabold '>
        <div className='flex items-center'>
            Action Owner
            {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>  
    </TableHead>
    </>
  )
}

export default UserInputHeader

