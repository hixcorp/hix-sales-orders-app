import React, {useState, useEffect} from 'react';
import { useSnapshot } from "valtio";
import { Input } from "../ui/input";
import { store } from "@/store/sales_data_store";
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '../date_range';

interface TableFilterProps {
    columnName: string; // Name of the column to filter
}

const TableFilter: React.FC<TableFilterProps> = ({ columnName }) => {
    const snap = useSnapshot(store, {sync: true});

    let initialFilter = snap.hg_filter[columnName] || '';
    const [isDateColumn, setIsDateColumn] = useState(false);

    useEffect(() => {
        if (isISODateString(initialFilter,columnName)) {
            setIsDateColumn(true);
        }
    }, [initialFilter]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        store.hg_filter = { ...store.hg_filter, [columnName]: e.target.value };
    };

    const handleDateChange = (dateRange: DateRange | undefined) => {
        if (dateRange===undefined) return
        store.hg_filter = { ...store.hg_filter, [columnName]: dateRange };
        store.applyFilter();
    };

    const handleApplyFilter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            store.applyFilter()
        }
    }
    console.log({isDateColumn,filters:snap.hg_filter})
    if (isDateColumn){
        return (
            <DatePickerWithRange
                className="max-w-sm"
                selected={snap.hg_filter[columnName] as DateRange}
                onSelect={handleDateChange}
            />
        );
    }else{
        return (
        <Input
            placeholder={`Filter ${columnName}...`}
            value={snap.hg_filter[columnName] as string}
            onChange={handleFilterChange}
            onKeyDown={handleApplyFilter}
            className="max-w-sm"
        />
    );
    }
    
}

export default TableFilter;

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
