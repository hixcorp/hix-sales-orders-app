'use client'
import React, { useState } from 'react'
import { Button } from './ui/button'
import { store } from '@/store/sales_data_store'
import { Spinner } from './ui/spinner'
import HoverTooltip from './tooltip'
import { api_url } from '@/lib/utils'
import {toast} from '@/components/ui/use-toast';
import { Checkbox } from './ui/checkbox'


const ExportCSV = () => {
    const [filtered, setFiltered] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleExport = async () => {
        if (typeof window === 'undefined') return
        const filter_settings = filtered ? store.hg_filter : {}
        setError('')
        setLoading(true)
        
        try{
            const response = await fetch(`${api_url}/export_to_csv`,{
                method:'POST',
                headers: {
                    'Content-Type': 'application/json',
                    },
                body: JSON.stringify({filters: filter_settings})
            })

            if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "export.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast({
                title: "Download started!",
                description: "Your CSV file is downloading.",
                duration: 2500
            });
        } else {
            const error = await response.json();
            toast({
                title: "Error",
                description: error.message || "An error occurred while processing the file.",
            });
        }
        }catch(err){
            console.warn({err})
            setError(String(err))
            
        }finally{
            setLoading(false)
        }

    }
    return (
    <div className='flex flex-col gap-1' >
        <div className='flex items-center gap-1'>
            <Button variant="outline" onClick={handleExport} disabled={loading}>Export CSV</Button>
            {loading && <Spinner size={'small'}/>}
            {!loading && <span className='flex items-center gap-1'><Checkbox checked={filtered} onCheckedChange={()=>setFiltered(!filtered)} /> With Filters</span>}
        </div>
        {error && 
        <HoverTooltip content={<pre>{error}</pre>}>
            <p className='text-destructive'>An error occured</p>
        </HoverTooltip>
        }
    </div>
  )
}

export default ExportCSV