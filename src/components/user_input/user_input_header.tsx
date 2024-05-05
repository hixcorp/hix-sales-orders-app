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

const UserInputHeader = () => {
    const [loading, setLoading] = useState(false)
     useEffect(()=>{
        const fetchUserInput = async () => {
            setLoading(true)
            try{
                setLoading(true)
                const res = await fetch(`${api_url}/get_all_user_input`)
                const data: UserInput[] = await res.json()
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


export const UserInputOrder = ({row}:{row:Data}) => {
   
  return (
    <>
        <AdditionalInfo row={row}/>
        <Action row={row}/>
        <ActionOwner row={row}/>    
    </>
  )
}

const AdditionalInfo = ({row}:{row:Data}) => {
    const [editing, setEditing] = useState(false)

    const handleChanges = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const row_input = store.user_input.find(u_in => u_in.id === row.ord_no)
        const formData = new FormData(e.currentTarget);
        const textareaValue = formData.get('additional_info') as string;
        // if (row_input) row_input.additional_info = textareaValue;
        console.log({row})
        const res = await fetch(`${api_url}/update_user_input_cols_by_id`,{
            method: "PATCH",
            headers: {
                    'Content-Type': 'application/json',
                    },
            body: JSON.stringify({
                id: row.ord_no,
                additional_info: textareaValue,
            })
        })

        const data: UserInput = await res.json()
        if (row_input) {
            Object.assign(row_input, data)
        }
        else {
            store.user_input.push(data)
        }
    
        setEditing(prev => !prev);
        console.log({row_input, textareaValue, data})
    }

    const snap = useSnapshot(store.user_input)

    const row_input = snap.find(u_in => u_in.id === row.ord_no)
    // console.log({row_input, snap})

    if (editing) return(
        
        <TableCell key={`${row.ord_no}_{k}`} className='text-inherit justify-center p-1 m-0 gap-1 font-normal'>
            {
                flexRender(
                <form onSubmit={(e) => handleChanges(e)} className='flex items-center'>
                    <div className="w-full p-1">
                    <Textarea defaultValue={row_input?.additional_info} id={`${row.ord_no}_{k}`} name="additional_info" className='text-xs text-primary h-auto min-h-[1ch] min-w-[30ch] p-0 m-0'/>
                    </div>
                    <button type='submit' className='p-0 m-0'><CheckCircle/></button>
                </form>,{})
            }
                
        </TableCell>
    )
    return (

    <TableCell key={`${row.ord_no}_{k}`} className='text-inherit flex items-center justify-center p-1 m-0 gap-1'>
        {flexRender
        (<>
            <pre className='text-inherit font-extrabold'>
                {/* Display Content from User Input Here */}
                {row_input && row_input.additional_info}
            </pre>
            <button className='p-0 m-0' onClick={()=>setEditing(prev => !prev)}><Edit/> </button>  
        </>,{})}
    </TableCell>
    )
}


const Action= ({row}:{row:Data}) => {
    return (
        
        <TableCell key={`${row.ord_no}_{k}`} className='p-0 m-0'>
            {flexRender
            (<>
                <Input id={`${row.ord_no}_{k}`} className=' text-primary font-normal min-w-[15ch]' />
            </>,{})}
        </TableCell>
    )
}

const ActionOwner = ({row}:{row:Data}) => {
    return(
        <TableCell key={`${row.ord_no}_{k}`} className='p-0 m-0'>
            {flexRender
        (<>
            <div className="w-full p-1 text-primary">
            <Input id={`${row.ord_no}_{k}`} className='text-primary font-normal min-w-[10ch]'/>
            </div>
        </>,{})}
        </TableCell>
    )
}