// salesStore.ts
import { proxy, subscribe } from 'valtio';
import { api_url } from '@/lib/utils';

export type SalesData2 = {
    data: Data[],
    errors: string[]
}
export type Data = {
    [key: string]: string | number;
}

export type SalesData = {
    data: string[][],
    schema: string[],
    errors: string[]
};

export type SalesSettings = {
    data: ColumnSettings[],
    errors: string[]
};

export type ColumnSettings = {
    column_name: string,
    hidden: boolean,
    display_name: string,
};


export interface Store {
    sales_data: SalesData2;
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

const defaultSalesData2: SalesData2 = {
    data: [],
    errors: []
};

const defaultSalesSettings: SalesSettings = {
    data: [],
    errors: []
};

export const store = proxy<Store>({
    sales_data: defaultSalesData2,
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
            const new_sales_data: SalesData2 = await response.json();
            store.sales_data = Object.assign(store.sales_data, new_sales_data);
            calculate_statistics()
            console.log({store})
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to fetch data';
        }
        store.loading = false;
    },
    fetchSettings: async () => {
        // store.loading = true;
        try {
            const column_names = {column_names: Object.keys(store.sales_data.data[0])}
            console.log({data_columns: column_names, json:JSON.stringify(column_names)})
            const response = await fetch(`${api_url}/get_item_settings_by_column_names`,
                {
                    method: "POST",
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(column_names)
                }
            );
            const new_settings: ColumnSettings[] = await response.json();
            console.log({new_settings})
            store.sales_settings.data = new_settings;
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to update settings';
        }
        // store.loading = false;
    },
    updateSettings: (newSettings: SalesSettings) => {
        store.sales_settings = { ...store.sales_settings, ...newSettings };
    },
    postSettings: async () => {
        store.loading = true;
        try {
            const response = await fetch(`${api_url}/update_item_settings_by_column_names`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(store.sales_settings.data)
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


function calculate_statistics() {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const ordersMap = new Map();
    store.sales_data.data.forEach((row) => {
        // Assuming the first element in each row is the date and the second element is the order number
        ordersMap.set(row["ord_no"], new Date(row["shipping_dt"]));
    });
    

    store.orders_due_this_week = Array.from(ordersMap).filter(([orderNumber, shipDate]) => {
        return shipDate >= startOfWeek && shipDate <= endOfWeek }
    ).map(([orderNumber]) => orderNumber);

    store.orders_past_due = Array.from(ordersMap).filter(([orderNumber, shipDate]) =>
        shipDate < currentDate
    ).map(([orderNumber]) => orderNumber);
}
// Using a focused subscription
// subscribe(store.sales_data, () => {

//     const currentDate = new Date();
//     const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
//     const endOfWeek = new Date(startOfWeek);
//     endOfWeek.setDate(endOfWeek.getDate() + 6);

//     const ordersMap = new Map();
//     store.sales_data.data.forEach((row) => {
//         // console.log({row})
//         // Assuming the first element in each row is the date and the second element is the order number
//         ordersMap.set(row["ord_dt"], new Date(row["ord_no"]));
//     });
//     console.log({ordersMap})

//     store.orders_due_this_week = Array.from(ordersMap).filter(([orderNumber, shipDate]) =>
//         shipDate >= startOfWeek && shipDate <= endOfWeek
//     ).map(([orderNumber]) => orderNumber);

//     store.orders_past_due = Array.from(ordersMap).filter(([orderNumber, shipDate]) =>
//         shipDate < currentDate
//     ).map(([orderNumber]) => orderNumber);
// });

// subscribe(store.sales_data.schema, ()=>{
//     get_table_definition()
// })

// subscribe(store.sales_settings.data, ()=>{
//     get_table_definition()
// })

store.fetchData().then(res => {
    console.log({res})
    store.fetchSettings().then(res => console.log({store}))
    
})
// store.fetchSettings()