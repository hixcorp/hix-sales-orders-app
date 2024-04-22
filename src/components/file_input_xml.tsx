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
import { Checkbox } from '@/components/ui/checkbox'
import {toast} from '@/components/ui/use-toast';
import { Dispatch, SetStateAction, useContext, useState } from 'react';
import { api_url } from '@/lib/utils';
import { SalesDataContext } from '@/app/salesdata_provider';

const ACCEPTED_FILE_FORMATS = ['text/xml','.xml','.XML']

const formSchema = z.object({
  file: z.instanceof(FileList)
    .refine((files) => files?.length >= 1, {
      message: "XML File is required",
    })
    .refine((files) => ACCEPTED_FILE_FORMATS.includes(files?.[0]?.type), {
      message: "Only .XML files are accepted",
    }),
  export_csv: z.boolean().default(true),
});

export default function FileInputXML(){
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            export_csv: true,
        }
    })
    const [loading, setLoading] = useState(false)

    const {update_sales_data} = useContext(SalesDataContext)

    function onSubmit (data: z.infer<typeof formSchema>) {
        console.log(data)
        setLoading(true)
        upload_xml(data, setLoading).then(()=>update_sales_data())
    }

    const fileRef = form.register("file");
    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} 
        className='p10'
        >
            <div className='gap-3 py-2'>
                <FormLabel>Upload XML File</FormLabel>
                <p className="text-xs">Upload the generated .XML file from the daily report to generate a formatted .csv</p>
                
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
                                                console.log({d})
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
            <FormField
                control={form.control}
                name="export_csv"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-1">
                    <FormControl>
                        <Checkbox
                        disabled={loading}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                            Export to CSV
                        </FormLabel>
                    </div>
                    </FormItem>
                )}
                />
            </form>
            {loading && <p>loading...</p>}
        </Form>
    )
}

async function upload_xml(data: z.infer<typeof formSchema>, setLoading:Dispatch<SetStateAction<boolean>>) {
    const formData = new FormData();
    formData.append("file", data.file[0]);
    formData.append("export_csv", String(data.export_csv));

    try {
        const response = await fetch(`${api_url}/upload_xml/`, {
            method: 'POST',
            body: formData,
        });

        if (response.ok && data.export_csv) {
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
    } catch (error) {
        console.error("There was an error:", error);
        toast({
            title: "Error",
            description: "An error occurred while processing the file.",
        });
    } finally{
        setLoading(false)
    }
}
