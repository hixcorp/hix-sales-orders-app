'use client'
import { TableData, get_table_data, get_table_definition } from "@/store/sales_data_store";
import { DataTable } from "../data_table";

function get_data(): TableData[]{
    return get_table_data()
}

export default function RenderTableData(){
    const data = get_data()
    const columns = get_table_definition()

    return(
        <DataTable columns={columns} data={data}/>
    )
}
