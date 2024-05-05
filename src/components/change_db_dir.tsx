'use client'
import React, { useContext, useEffect, useState } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { appCacheDir } from '@tauri-apps/api/path';
import { Button } from '@/components/ui/button';
import { twMerge } from 'tailwind-merge';
import { api_url } from '@/lib/utils';
import { SalesDataContext } from '@/app/salesdata_provider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from './ui/label';
import { DatabaseZap } from 'lucide-react';
import { store } from '@/store/sales_data_store';

interface DirectorySelectorProps {
    button_label?: string,
    className?: string
}



const ChangeDatabaseDirectory: React.FC<DirectorySelectorProps> = ({button_label="Select Directory", className}) => {
    const [newDBLocation, setNewDBLocation] = useState<string | string[] | null>(null);
    const [currentDB, setCurrentDB] = useState<string>('')
    const [localDB, setLocalDB] = useState<string>('')
    const [usingDefault, setUsingDefault] = useState<boolean>(true)
    const [locationType, setLocationType] = useState<string>('folder')
    const [errors, setErrors] = useState<string>('')

    const { update_sales_data, sales_data} = useContext(SalesDataContext)
    const handleSelectDirectory = async () => {
        try {
            //Load local folder from the file system if not using url
            const result = await open({
                directory: locationType==='folder',
                multiple: false,
                filters: [{name:'*', extensions:['db']}],
                defaultPath: await appCacheDir(),
            });
        
            setNewDBLocation(result);  
                      
        } catch (error) {
            console.error('Error selecting directory:', error);
            setNewDBLocation(String(error))
        }
    };
    const setDatabaseLocation = async () => {
        if (!newDBLocation) return;  // Simple check for falsy values

        try {
            const response = await fetch(`${api_url}/add_preferred_database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',  // This specifies that the body format is JSON
                },
                body: JSON.stringify({ new_location: newDBLocation, location_type: locationType }) 
            });

            if (response.ok) {
                // If the request was successful, parse the JSON response
                const data = await response.json();
                console.log(data);
            } else {
                // If the request was an error, parse the JSON error and log it
                const errorData = await response.json(); // Assume error details are in JSON
                console.log({ res: response, detail: errorData.detail });
                setErrors(errorData.detail || 'Unknown error occurred');
            }
        } catch (err) {
            // Log and handle network errors or other unexpected errors
            console.error('Network error or other error:', err);
            setErrors('Network error or other error occurred');
        }

        get_db_info()
        store.fetchData()
        // update_sales_data()
    };

    const handleResetDatabase = async () => {
        const result = await fetch(`${api_url}/reset_default_database`).then(res=>res.json())
        get_db_info()
    }

    const get_db_info = async () => {
                try{
                    const local_database = await fetch(`${api_url}/local_database`).then(res=>res.json())
                    const current_database = await fetch(`${api_url}/current_database`).then(res=>res.json())
                    const using_default = await fetch(`${api_url}/using_default_database`).then(res=>res.json())
                    setLocalDB(local_database?.path || '')
                    setCurrentDB(current_database?.path || '')
                    setUsingDefault(using_default.using_default)
                }catch(err){
                    console.error(err)
                }
            }
    
    const toggleSelectFolder = (v: React.SetStateAction<string>)=>{
        setLocationType(v)
        setNewDBLocation('')
    }

    const handleInputUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log({e, v:e.target.value})
        setNewDBLocation(e.target.value)
    }

    const toggleDatabase = async (mode:string) => {
        const res = await fetch(`${api_url}/use_${mode}_database`)
        if (!res.ok){
            const errors = await res.json()
            console.log({res, detail: errors.detail})
            setErrors(errors.detail || 'Unknown error occured')
        }
        
        await get_db_info()
        update_sales_data()
    }

    useEffect(()=>{
        get_db_info()
    },[sales_data])
    return (
        <div>
            <div className='flex items-center gap-2'>
                <DatabaseZap className={errors?'stroke-red-500' : 'stroke-green-500'}/>
                <div className='flex flex-col p-0 m-0'>
                    <strong className='p-0 m-0'>Current Database {"->"} {usingDefault? 'Default' : 'Preferred'}:</strong>
                    <div className='p-0 pl-2 text-gray-600 pt-[-1ch] m-0 mt-[-1ch]'>{currentDB}</div>
                </div>
            </div>
            {
            usingDefault ?
            <div className='flex flex-col pl-8'>
                <div className='flex flexitems-center gap-2 py-2'>
                    <strong>Change Preferred Database Location: </strong>
                    <RadioGroup className={'flex gap-2'} defaultValue="folder" onValueChange={toggleSelectFolder}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="file" id="r1" />
                        <Label htmlFor="r1">File</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="folder" id="r2" />
                        <Label htmlFor="r2">Folder</Label>
                    </div>
                    </RadioGroup>
                </div>
                <div className='flex min-w-[30ch] w-30'>
                    {locationType === 'url' ?
                        <input className='p-1 border min-w-[30ch] rounded' value={newDBLocation as string} onChange={(e) => handleInputUrl(e)}></input>
                    :
                        <span className='p-1 border min-w-[30ch] rounded'>{newDBLocation}</span>
                    }
                    <Button className={twMerge('h-6 m-1 p-1 text-xs',className)} onClick={handleSelectDirectory} disabled={locationType==='url'}>Browse</Button>
                    <Button className={twMerge('h-6 m-1 text-xs bg-blue-800',className)} onClick={setDatabaseLocation} disabled={!!!newDBLocation}>Apply</Button>
                    <Button className={twMerge('h-6 m-1 p-1 text-xs',className)} onClick={()=>toggleDatabase('preferred')}>Use Preferred Database</Button>               
                </div>
                <span className='text-red-800'>{errors}</span>
            </div>
            :
            <div className='flex flex-col pl-8 max-w-fit'>
                <Button className={twMerge('h-6 m-1 p-2 text-xs',className)} onClick={()=>toggleDatabase('default')}>Use Default Database</Button>
                <Button className={twMerge('h-6 m-1 p-2 text-xs bg-orange-500',className)} onClick={handleResetDatabase}>Reset Preferred Database</Button>                
            </div>
            }
        </div>
    );
};

export default ChangeDatabaseDirectory;
