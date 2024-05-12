
'use client'
import React, { useState } from 'react'
import { TableCell } from '@/components/ui/table'
import { Data, store } from '@/store/sales_data_store'
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, Edit} from 'lucide-react'
import { flexRender } from '@tanstack/react-table'
import { Spinner } from '@/components/ui/spinner'
import { useSnapshot } from 'valtio'
import HoverTooltip from '../tooltip'
import { formatDate, updateUserInput } from './user_input_field'

export const AdditionalInfo = ({row}:{row:Data}) => {
    const [editing, setEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [updateError, setUpdateError] = useState(false)
    const current_user = store.current_user
    const handleChanges = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const row_input = store.user_input.find(u_in => u_in.id === row.ord_no)
        const formData = new FormData(e.currentTarget);
        const textareaValue = formData.get('additional_info') as string;
        // Dont make any network requests if no changes made
        if (textareaValue !== row_input?.additional_info) {
            updateUserInput({additional_info:textareaValue},setLoading,setUpdateError,row, current_user).catch(err=>{console.warn({err})})
        }
        setEditing(prev => !prev);
    }

    const snap = useSnapshot(store.user_input)
    const row_input = snap.find(u_in => u_in.id === row.ord_no) 

    const tooltip = row_input ? 
    `Status fields last updated on ${formatDate(row_input.last_updated)}${row_input.updated_by ? 'by ' + row_input.updated_by: ''}` 
    : ''

    if (editing) return(
        
        <TableCell className='text-inherit justify-between p-1 m-0 gap-1 font-normal'>
            {
                flexRender(
                <TooltipForm
                    loading ={loading}
                    callback={handleChanges}
                    textarea={<Textarea defaultValue={row_input?.additional_info} id={`${row.ord_no}_add_info`} name="additional_info" className='text-xs text-primary h-auto min-h-[1ch] min-w-[30ch] p-0 m-0'/>}
                    tooltip={tooltip}
                 />
                ,{})
            }
                
        </TableCell>
    )
    return (

    <TableCell className='text-inherit p-1 m-0'>
        {flexRender
        (
            <div className='flex justify-between w-full items-center gap-1' >
            <HoverTooltip content={tooltip} >
                <pre className={`text-white font-bold w-max max-w-[80ch] px-2 text-left whitespace-pre-wrap break-words w-full bg-accent/[0.80] rounded ${row_input && row_input.additional_info ? 'p-1 shadow-lg' : ''}`}>
                    {/* Display Content from User Input Here */}
                    {row_input && row_input.additional_info}
                </pre>
            </HoverTooltip>  
            {loading ? <Spinner size={'small'}/>:<button className='p-0 m-0' onClick={()=>setEditing(true)}><Edit/> </button>  }
            
            {updateError && <div className='text-xs text-destructive'>An error occured, could not update</div>}
            </div>
        ,{})
        }
    </TableCell>
    )
}


import { TooltipTrigger, TooltipContent, Tooltip, TooltipProvider } from "@/components/ui/tooltip"
// import { useSession } from 'next-auth/react'

function TooltipForm({loading, callback, textarea, tooltip}:{
    loading: boolean,
    callback: (e:React.FormEvent<HTMLFormElement>)=>void,
    textarea:React.ReactNode,
    tooltip: string

}) {
  return (
    <form onSubmit={callback} className="flex items-center w-full justify-between gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild className=''>
            {textarea}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            {loading ? <Spinner size={'small'}/>: <button type='submit' className='p-0 m-0'><CheckCircle/></button>}
          </TooltipTrigger>
          <TooltipContent>
            <p>Save Changes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </form>
  )
}
