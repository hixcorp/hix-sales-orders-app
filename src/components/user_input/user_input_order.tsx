
'use client'
import { Data } from '@/store/sales_data_store'
import { AdditionalInfo } from './additional_input'
import { UserInputField } from './user_input_field'
import { UserDropdownField } from './user_dropdown_field'

export const UserInputOrder = ({row}:{row:Data}) => {
  
  return (
    <>
        <AdditionalInfo row={row}/>
        <UserInputField key={`${row.order_no || 'order'}_action`} row={row} field={"action"}/>
        <UserDropdownField key={`${row.order_no || 'order'}_action_owner`} row={row} field={"action_owner"} label='Action Owner'/>
    </>
  )
}

export default UserInputOrder
