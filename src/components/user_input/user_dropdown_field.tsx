
'use client'
import React, { useState } from 'react'
import { TableCell } from '@/components/ui/table'
import { AllowedValue, AllowedValueCreate, Data, store } from '@/store/sales_data_store'
import { flexRender } from '@tanstack/react-table'
import { server_url, cn } from '@/lib/utils'
import { UserInput } from '@/store/sales_data_store'
import { Spinner } from '@/components/ui/spinner'
import { useSnapshot } from 'valtio'
import HoverTooltip from '../tooltip'
import { ComboboxCell } from './combobox_input'
import { Session } from 'next-auth'
import { get_allowed_values } from './user_input_header'

export const UserDropdownField = ({ row, field, label }: { row: Data, field: keyof UserInput, label?:string }) => {
    const snap = useSnapshot(store.user_input)
    const snap_store = useSnapshot(store)
    const [loading, setLoading] = useState(false);
    const [updateError, setUpdateError] = useState(false)
    const current_user = snap_store.current_user
    const row_input = snap.find(u_in => u_in.id === row.ord_no)

    const tooltip = row_input ? 
    `Status fields last updated on ${formatDate(row_input.last_updated)}${row_input.updated_by ? ' by ' + row_input.updated_by: ''}` 
    : ''

    const handleChanges = async (selected: string) => {
        const selectedValue = selected;
        
        const row_input = store.user_input.find(u_in => u_in.id === row.ord_no);
        // Don't make any network requests if no changes are made
        if ((selectedValue !== row_input?.[field]) && !(!!!selectedValue && !row_input)) {
           updateUserInput({[field]:selectedValue},setLoading, setUpdateError,row, current_user)
        }
    }

    const handleAddOption = async (option:AllowedValueCreate) => {
        try{
            const res = await fetch(`${server_url}/add_allowed_input`,{
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(option)
            })
            if (res.ok) {
                await handleChanges(option.value)
                update()
            }
        }catch(err){
            console.warn(err)
        }
    }

    const handleRemoveOption = async (option:AllowedValue) => {
        try{
            const res = await fetch(`${server_url}/remove_allowed_input/${option.type}/${option.value}`,{
                method:"DELETE"
            })
            if (res.ok){
                await handleChanges("")
                update()
            }
        }catch(err){
            console.warn(err)
        }
    }

    const update = async () => {
        await get_allowed_values(field).then(res=>{
                Object.assign(store.allowed_values, res)
                })
    }
    
    return (
        <TableCell className='p-0 m-0 text-secondary-foreground'>
            {flexRender(
                <>
                <HoverTooltip content={tooltip} className='flex items-center gap-1 p-1'>
                    
                    <ComboboxCell 
                        field={field} 
                        val={row_input?.[field]} 
                        handleSelect={handleChanges} 
                        label={label}
                        addFn={handleAddOption}
                        removeFn={handleRemoveOption}
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
        const date = new Date(Date.parse(str))
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }

export const updateUserInput = async (
    new_data: {[key:string]: string | number | Date},
    setLoading:(loading:boolean)=>void, 
    setError:(loading:boolean)=>void, 
    row:Data,
    current_user?: Session | null
) => {
    const row_input = store.user_input.find(u_in => u_in.id === row.ord_no)
    
    setLoading(true)
    setError(false)
    const res = await fetch(`${server_url}/update_user_input_cols_by_id`,{
        method: "PATCH",
        headers: {
                'Content-Type': 'application/json',
                },
        body: JSON.stringify({
            id: row.ord_no,
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
