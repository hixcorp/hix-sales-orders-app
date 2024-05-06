'use client'
import React, { useEffect, useState } from 'react'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Data, store } from '@/store/sales_data_store'
import { Textarea } from "@/components/ui/textarea"
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { CheckCircle, Edit, Edit2, RefreshCw } from 'lucide-react'
import { flexRender } from '@tanstack/react-table'
import { api_url } from '@/lib/utils'
import { UserInput } from '@/store/sales_data_store'
import { Spinner } from '@/components/ui/spinner'
import { useSnapshot } from 'valtio'
import HoverTooltip from '../tooltip'

const UserInputHeader = () => {
    const [loading, setLoading] = useState(false)
     useEffect(()=>{
        const fetchUserInput = async () => {
            setLoading(true)
            try{
                setLoading(true)
                const res = await fetch(`${api_url}/get_all_user_input`)
                const data: UserInput[] = await res.json()
                console.log({data})
                if (data instanceof(Array)) store.user_input = data
            }catch(err){
                console.warn({err})
            }finally{
                setLoading(false)
            }
        }
        fetchUserInput()
    },[])

  return (
    <>
     <TableHead  className='sticky top-0 p-2 h-full gap-1 bg-secondary text-inherit font-extrabold'>
        <div className='flex items-center'>
            Additional Info
        {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>
    </TableHead>
     <TableHead  className='sticky top-0 p-2 h-full gap-1 bg-secondary text-inherit font-extrabold'>
        <div className='flex items-center'>
            Action
            {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>
    </TableHead>
     <TableHead  className='sticky top-0 p-2 h-full gap-1 bg-secondary text-inherit font-extrabold '>
        <div className='flex items-center'>
            Action Owner
            {loading && <Spinner size={"small"} className='p-0 m-3'/>}
        </div>  
    </TableHead>
    </>
  )
}

export default UserInputHeader

