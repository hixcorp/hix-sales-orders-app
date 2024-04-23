'use client';
import { api_url } from '@/lib/utils';
import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';


// Default settings and data conforming to the expected types
const defaultSalesSettings: SalesSettings = {
    hidden_columns: [],
    data: [],
    errors: []
};

const defaultSalesData: SalesData = {
    data: [[]],
    schema: [],
    errors: []
};

export const SalesDataContext = createContext<SalesContext>({
    sales_data: defaultSalesData,
    update_sales_data: () => {},
    loading: false,
    fetch_errors: '',
    settings: defaultSalesSettings,
    get_sales_settings: () => {},
    post_sales_settings: () => {},
    update_sales_settings: (new_settings: SalesSettings) => {},
});

export type SalesContext = {
    sales_data: SalesData,
    update_sales_data: () => void,
    loading: boolean,
    fetch_errors: string,
    settings: SalesSettings,
    get_sales_settings: () => void,
    post_sales_settings: () => void,
    update_sales_settings: (new_settings: SalesSettings) => void,
}

export type SalesData = {
    data: string[][],
    schema: string[],
    errors: string[]
}

export type SalesSettings = {
    hidden_columns : string[],
    data : ColumnSettings[],
    errors: string[]
}

export type ColumnSettings = {
    column_name: string,
    hidden: boolean,
    display_name: string,
}

export default function SalesDataProvider({children}:{children:ReactNode}) {
    const [data, setData] = useState<SalesData>(defaultSalesData);
    const [loading, setLoading] = useState(false);
    const [fetch_errors, setErrors] = useState('')
    const [settings, setSettings] = useState<SalesSettings>(defaultSalesSettings);

    useEffect(()=>{
        get_sales_data()
        get_sales_settings()
    }, [])

    const get_sales_data = async () => {
        try {
            setLoading(true)
            const new_sales_data: SalesData = await fetch(`${api_url}/all_items`)
                                                        .then(res => {if (res.status===200){return res.json()}
                                                                      else if(res.status===404){setData(defaultSalesData)}
                                                                      })
            console.log({new_sales_data})
            if (new_sales_data) {
                setData(data => ({...data, ...new_sales_data}))
            }

        }catch(err){
            console.log({err})
            setErrors(typeof(err) === 'string' ? err : 'An error occured while trying to fetch data')
        }finally{
            setLoading(false)
        }
    }

    const get_sales_settings = async () => {
        try{
            setLoading(true)
            const new_settings: SalesSettings = await fetch(`${api_url}/items_settings`).then(res => res.json())
            console.log({new_settings})
            if (new_settings){
                setSettings(data => ({...data, ...new_settings}))
            }
        }catch(err){
            console.error({err})
            setErrors(typeof(err) === 'string' ? err : 'An error occured while trying to update settings')
        }
        finally{
            setLoading(false)
        }
    }

    const post_sales_settings = async () => {
        try{
            setLoading(true)
            
            const response: any = await fetch(`${api_url}/items_settings`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',  // This specifies that the body format is JSON
                },
                body: JSON.stringify({ settings: settings?.data}) 
            }).then(res => res.json())
            if (await response) get_sales_settings()
        }catch(err){
            console.error({err})
            setErrors(typeof(err) ==='string' ? err : 'An error occured while trying to update settings')
        }finally{
            setLoading(false)
        }
    }

    const update_sales_settings = async (new_settings: SalesSettings) => {
        setSettings((prev_settings) => ({...prev_settings, ...new_settings}))
    }

    const value: SalesContext = {
                   sales_data:data, 
                   update_sales_data: get_sales_data,
                   loading, 
                   fetch_errors, 
                   settings,
                   get_sales_settings,
                   post_sales_settings,
                   update_sales_settings
                };

    return(
        <SalesDataContext.Provider value={value}>
                {children}
        </SalesDataContext.Provider>
    )
}