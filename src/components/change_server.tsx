'use client'
import { local_api_url, server_url, toggleServer } from '@/lib/utils'
import { DatabaseZap } from 'lucide-react'
import React, { useState } from 'react'
import { Button } from './ui/button'
import { store, subscribe_to_updates } from '@/store/sales_data_store'
import { useSnapshot } from 'valtio'
import { Spinner } from './ui/spinner'

const ChangeServer = () => {
    const snap = useSnapshot(store)
    const [loading, setLoading] = useState(false)

    const change_server = async () => {
        setLoading(true)
        toggleServer()
        try{
            const res = await fetch(`${server_url}/current_database`)
            if (res){
                await store.fetchData()
                await store.fetchSettings()
                subscribe_to_updates()
                store.connected = true
            }
            else{
                store.connected = false
            }
        }catch{
            store.connected = false
        }finally{
            setLoading(false)
            store.local_server = server_url === local_api_url
        }
    }

    return (

    <div className='flex items-center gap-2'>
        <DatabaseZap className={snap.connected?'stroke-green-500' : 'stroke-red-500'}/>
        <div className='flex flex-col p-0 m-0'>
            <strong className='p-0 m-0'>Current Database Server {"->"} {server_url === local_api_url ? 'Local' : 'HIXTS001'}:</strong>
            <div className='p-0 pl-2 text-gray-600 pt-[-1ch] m-0 mt-[-1ch]'>{server_url}</div>
            {!snap.connected && <span className='text-destructive'>Selected database could not be reached</span>}
        </div>
        <Button onClick={change_server} disabled={loading}>Change Server</Button>
        {loading && <Spinner size={'small'}/>}
        
    </div>
    )
}

export default ChangeServer