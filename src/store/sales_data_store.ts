// salesStore.ts
import { proxy, subscribe } from 'valtio';
import { api_url } from '@/lib/utils';

export type SalesData = {
    data: string[][],
    schema: string[],
    errors: string[]
};

export type SalesSettings = {
    hidden_columns: string[],
    data: ColumnSettings[],
    errors: string[]
};

export type ColumnSettings = {
    column_name: string,
    hidden: boolean,
    display_name: string,
};


export interface Store {
    sales_data: SalesData;
    sales_settings: SalesSettings;
    loading: boolean;
    editing: boolean;
    table_view: string,
    expand_all: boolean,
    fetch_errors: string;
    orders_due_this_week: string[];
    orders_past_due: string[];
    fetchData: () => Promise<void>;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: SalesSettings) => void;
    postSettings: () => Promise<void>;
}

const defaultSalesData: SalesData = {
    data: [[]],
    schema: [],
    errors: []
};

const defaultSalesSettings: SalesSettings = {
    hidden_columns: [],
    data: [],
    errors: []
};

export const store = proxy<Store>({
    sales_data: defaultSalesData,
    sales_settings: defaultSalesSettings,
    loading: false,
    editing: false,
    table_view: 'order',
    expand_all: true,
    fetch_errors: '',
    orders_due_this_week: [],
    orders_past_due: [],
    fetchData: async () => {
        store.loading = true;
        try {
            const response = await fetch(`${api_url}/all_items`);
            const new_sales_data: SalesData = await response.json();
            store.sales_data = Object.assign(store.sales_data, new_sales_data);
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to fetch data';
        }
        store.loading = false;
    },
    fetchSettings: async () => {
        store.loading = true;
        try {
            const response = await fetch(`${api_url}/items_settings`);
            const new_settings: SalesSettings = await response.json();
            store.sales_settings = { ...store.sales_settings, ...new_settings };
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to update settings';
        }
        store.loading = false;
    },
    updateSettings: (newSettings: SalesSettings) => {
        store.sales_settings = { ...store.sales_settings, ...newSettings };
    },
    postSettings: async () => {
        store.loading = true;
        try {
            const response = await fetch(`${api_url}/items_settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ settings: store.sales_settings.data })
            });
            await response.json();
            await store.fetchSettings();
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to update settings';
        }
        store.loading = false;
    }
});



// Using a focused subscription
subscribe(store.sales_data, () => {

    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const ordersMap = new Map();
    store.sales_data.data.forEach((row) => {
        // Assuming the first element in each row is the date and the second element is the order number
        ordersMap.set(row[1], new Date(row[0]));
    });

    store.orders_due_this_week = Array.from(ordersMap).filter(([orderNumber, shipDate]) =>
        shipDate >= startOfWeek && shipDate <= endOfWeek
    ).map(([orderNumber]) => orderNumber);

    store.orders_past_due = Array.from(ordersMap).filter(([orderNumber, shipDate]) =>
        shipDate < currentDate
    ).map(([orderNumber]) => orderNumber);
});

// subscribe(store.sales_data.schema, ()=>{
//     get_table_definition()
// })

// subscribe(store.sales_settings.data, ()=>{
//     get_table_definition()
// })

store.fetchData()
store.fetchSettings()

import { ColumnDef } from '@tanstack/react-table';

export interface TableData{
    [key: string]: any;
}

export function get_table_definition(): ColumnDef<TableData>[]{
    const columns: ColumnDef<TableData>[] = store.sales_data.schema.map((col, idx) => {
        const c_settings = store.sales_settings.data.find(item => item.column_name === col)

        return {
            id: `${col}_${idx}`,
            accessorKey: col,
            header: c_settings?.display_name || col,
            cell: info => info.getValue(),
            enableHiding: true,
            isVisible: !c_settings?.hidden
        }
    })
    return columns
}

export function get_table_data(): TableData[] {
    const schema = store.sales_data.schema
    return store.sales_data.data.map(row => {
        let obj:TableData = {};
        row.forEach((value, index) => {
            obj[schema[index]] = value;
        });
        return obj;
    })
}