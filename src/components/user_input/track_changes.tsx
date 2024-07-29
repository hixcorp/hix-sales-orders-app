'use client'
import { Data, UserInput, store } from '@/store/sales_data_store'
import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

export const TrackChanges = ({row, setHighlight}:{row:Data, setHighlight:React.Dispatch<React.SetStateAction<boolean>>}) => {
  const snap_store = useSnapshot(store)
  
  let row_input: UserInput | undefined
  if (snap_store.user_input.length) {
    row_input = store.user_input.find(u_in => u_in.id === row.ord_no)
    
  }

  if (!row_input) return null

  return (
    <ApplyHighlights row_input={row_input} setHighlight={setHighlight}/>
  )
}

export default TrackChanges

const ApplyHighlights = ({row_input, setHighlight}:{row_input:UserInput, setHighlight:React.Dispatch<React.SetStateAction<boolean>>})  => {
    const snap_store = useSnapshot(store)
    const current_user = snap_store.current_user

    const snap = useSnapshot(row_input)
    const [compareDate, setCompareDate ]  = useState(new Date(Date.now()))

    useEffect(()=>{
        let updated_date: Date | null = null
        if (snap.last_updated) updated_date = new Date(snap.last_updated)
        if (updated_date && updated_date > compareDate && snap.updated_by !== current_user?.user?.name){
        
            setTimeout(()=>{
                setHighlight(false)
                setCompareDate(updated_date)
            },5000)
            setHighlight(true)
        }
    },[row_input.last_updated])


    return(
        <></>
    )
}
