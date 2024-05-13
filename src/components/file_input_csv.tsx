'use client'
import {z} from 'zod'

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {Input} from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {toast} from '@/components/ui/use-toast';
import { Dispatch, SetStateAction, useState } from 'react';
import { api_url } from '@/lib/utils';
import { store } from '@/store/sales_data_store';
import { DropdownMenu, DropdownMenuContent } from './ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import _ from 'lodash'
const ACCEPTED_FILE_FORMATS = ['text/csv','.csv','.csv']

export default function FileInputCSV(){

    const formSchema = z.object({
    file: z.any()
            .refine((files) => _.isArrayLikeObject(files) && files?.length >= 1, {
        message: "CSV File is required",
        })
        .refine((files:any) => ACCEPTED_FILE_FORMATS.includes(files.item(0)!.type), {
        message: "Only .CSV files are accepted",
        }),
    });


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })
    const [loading, setLoading] = useState(false)


    function onSubmit (data: z.infer<typeof formSchema>) {
        setLoading(true)
        upload_csv(data, setLoading)
    }

    async function upload_csv(data: z.infer<typeof formSchema>, setLoading:Dispatch<SetStateAction<boolean>>) {
        const formData = new FormData();
        formData.append("file", data.file[0] as File);
        try {
            const response = await fetch(`${api_url}/import_user_input/`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                store.fetchData()
                toast({
                    title: "Your data was imported successfully",
                    description: "See the order numbers for latest data",
                    duration: 2500
                });
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.message || "An error occurred while processing the file.",
                });
            }
        } catch (error) {
            console.error("There was an error:", error);
            toast({
                title: "Error",
                description: "An error occurred while processing the file. Make sure the file content is correct.",
            });
        } finally{
            setLoading(false)
        }
    }

    const fileRef = form.register("file");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant={'outline'}>
                    Import Status Inputs
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} 
        className='p10'
        >
            <div className='gap-3 py-2'>
                <FormLabel>Import Status Updates from csv</FormLabel>
                <p className="text-xs">Upload .csv file to update status fields for orders</p>
                
                <FormField
                    control={form.control}
                    name='file'
                    render={({ field }) => {
                        return (
                        <div className="flex flex-col">
                            <FormMessage />
                            <FormItem className='flex items-end gap-2'>
                                
                                <FormControl className='flex '>
                                    <Input  type="file" 
                                            placeholder="file" 
                                            {...fileRef} 
                                            onChange={(event)=>{
                                                const d = event?.target?.files ?? {}
                                                field.onChange(d)
                                            }}
                                            className='w-250 hover:cursor-pointer'
                                            disabled={loading}
                                            />
                                </FormControl>
                                <Button type='submit' disabled={loading}>Submit</Button>
                                
                            </FormItem>
                            </div>
                        );
                    }}
                />
            </div>    
            </form>
            {loading && <p>loading...</p>}
        </Form>
            </DropdownMenuContent>
        </DropdownMenu>
        
    )
}

