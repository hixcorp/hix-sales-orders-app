
'use client'
import React, {  } from 'react'
import { Data } from '@/store/sales_data_store'
import { AdditionalInfo } from './additional_input'
import { UserInputField } from './user_input_field'

export const UserInputOrder = ({row}:{row:Data}) => {
   
  return (
    <>
        <AdditionalInfo row={row}/>
        <UserInputField key={`${row.order_no || 'order'}_action`} row={row} field={"action"}/>
        <UserInputField row={row} field={"action_owner"}/>
    </>
  )
}

export default UserInputOrder
