
'use client'
import React, { useState } from 'react'
import { TableCell } from '@/components/ui/table'
import { Data, store } from '@/store/sales_data_store'
import { Input } from '../ui/input'
import { flexRender } from '@tanstack/react-table'
import { api_url } from '@/lib/utils'
import { UserInput } from '@/store/sales_data_store'
import { Spinner } from '@/components/ui/spinner'
import { useSnapshot } from 'valtio'
import HoverTooltip from '../tooltip'
// import { useSession } from 'next-auth/react'
import { Session } from 'next-auth'

export const UserInputField = ({ row, field }: { row: Data, field: keyof UserInput }) => {
    const snap = useSnapshot(store.user_input)
    const [loading, setLoading] = useState(false);
    const [updateError, setUpdateError] = useState(false)
    // const current_user = useSession().data
    const current_user = store.current_user
    const row_input = snap.find(u_in => u_in.id === row.ord_no)

    const tooltip = row_input ? 
    `Status fields last updated on ${formatDate(row_input.last_updated)}${row_input.updated_by ? 'by ' + row_input.updated_by: ''}` 
    : ''

    const handleChanges = async (e: React.FormEvent<HTMLInputElement>) => {
        // Stop form submission from refreshing the page
        e.preventDefault();
        const textareaValue = e.currentTarget.value;
        
        const row_input = store.user_input.find(u_in => u_in.id === row.ord_no);
        // Don't make any network requests if no changes are made
        if ((textareaValue !== row_input?.[field]) && !(!!!textareaValue && !row_input)) {
            console.log({textareaValue,row_input,textFalse:!textareaValue, rowFalse:!row_input})
           updateUserInput({[field]:textareaValue},setLoading, setUpdateError,row, current_user)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleChanges(e as unknown as React.FormEvent<HTMLInputElement>);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        handleChanges(e as unknown as React.FormEvent<HTMLInputElement>);
    };

    return (
        <TableCell className='p-0 m-0'>
            {flexRender(
                <>
                <HoverTooltip content={tooltip} className='flex items-center gap-1 p-1'>
                    <Input 
                        id={`${row.ord_no}_${field}`} 
                        name='action' 
                        className='text-destructive text-xs font-extrabold min-w-[40ch]' 
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        defaultValue={row_input?.[field]}
                    />
                    {loading && <Spinner size={'small'} />}
                </HoverTooltip>
                {updateError && <div className='text-xs text-destructive'>An error occured, could not update</div>}
                </>
                , 
                {}
            )}
        </TableCell>
    );
}

export const formatDate = (str:string) => {
        const date = new Date(Date.parse(str+'Z'))
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }

export const updateUserInput = async (
new_data: { [key: string]: string | number | Date} , setLoading: (loading: boolean) => void, setError: (loading: boolean) => void, row: Data, current_user: Session | null) => {
    const row_input = store.user_input.find(u_in => u_in.id === row.ord_no)
    
    setLoading(true)
    setError(false)
    const date = new Date()
    const res = await fetch(`${api_url}/update_user_input_cols_by_id`,{
        method: "PATCH",
        headers: {
                'Content-Type': 'application/json',
                },
        body: JSON.stringify({
            id: row.ord_no,
            // additional_info: textareaValue,
            last_updated: Date.parse(date.toUTCString()),
            updated_by: current_user?.user?.name,
            ...new_data
        })
    })

    if (res.ok){
            const data: UserInput = await res.json()
        if (row_input) {
            Object.assign(row_input, data)
        }
        else {
            store.user_input.push(data)
        }
        
    }else{
        setError(true)
    }
    setLoading(false)
}