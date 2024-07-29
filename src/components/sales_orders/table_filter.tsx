import React, {useState, useEffect} from 'react';
import { useSnapshot } from "valtio";
import { Input } from "../ui/input";
import { store } from "@/store/sales_data_store";
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '../date_range';
import { CircleX } from 'lucide-react';
import { Button } from '../ui/button';

interface TableFilterProps {
    columnName: string; // Name of the column to filter
}

const TableFilter: React.FC<TableFilterProps> = ({ columnName }) => {
    const snap = useSnapshot(store, {sync: true});

    let initialFilter = snap.hg_filter[columnName] || '';
    const [isDateColumn, setIsDateColumn] = useState(false);
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        if (isISODateString(initialFilter,columnName)) {
            setIsDateColumn(true);
        }
    }, [initialFilter,columnName]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        Object.assign(store.hg_filter, {[columnName]:e.target.value})
        if (!submitted) setSubmitted(false)
    };

    const handleDateChange = (dateRange: DateRange | undefined) => {
        if (dateRange===undefined) return
        Object.assign(store.hg_filter, {[columnName]:dateRange})
        store.applyFilter();
        setSubmitted(true)
    };

    const handleApplyFilter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (store.hg_filter.hasOwnProperty(columnName) && !store.hg_filter[columnName]){
                delete store.hg_filter[columnName]
            }
            store.applyFilter()
            setSubmitted(true)
        }
    }

    const clearFilter = (columnName: string) => {
        if (store.hg_filter.hasOwnProperty(columnName)) {
            delete store.hg_filter[columnName]
            store.applyFilter()
            setSubmitted(false)
        }
    }

    if (isDateColumn){
        return (
            <>
            <div className='flex items-center gap-1'>
                <DatePickerWithRange
                className="max-w-sm"
                selected={snap.hg_filter[columnName] as DateRange}
                onSelect={handleDateChange}
                />
                <Button><CircleX onClick={()=>clearFilter(columnName)}/></Button>
            </div>
            <NotFound columnName={columnName} submitted={submitted}/>
            </>
        );
    }else{
        return (
            <>
        <div className='flex items-center gap-1'>
            <Input
            placeholder={`Filter ${columnName}...`}
            value={snap.hg_filter[columnName] as string || ''}
            onChange={handleFilterChange}
            onKeyDown={handleApplyFilter}
            className="max-w-sm"
            />
            <Button><CircleX onClick={()=>clearFilter(columnName)}/></Button>
        </div>
        <NotFound columnName={columnName} submitted={submitted}/> 
        </>
    );
    }
    
}

export default TableFilter;

export const NotFound = ({columnName, submitted}:{columnName:string, submitted:boolean}) => {
    const snap = useSnapshot(store)

    if (!submitted) return null
    
        if (Object.keys(snap.sales_data.filtered_data).length === 0 && snap.hg_filter.hasOwnProperty(columnName)){
            return <span className='text-destructive text-xs'>None Found</span>
        }else{
            return null
        }
}

export const isISODateString = (val: string | object, columnName:string) => {
    if (typeof val === 'string'){
        if (['shipping_dt','order_dt'].includes(columnName)) return true
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(val);
    }else if (typeof val === 'object'){
        if (val.hasOwnProperty('from') && val.hasOwnProperty('to')){
            return true
        }
    }else{
        return false
    }
    
};
