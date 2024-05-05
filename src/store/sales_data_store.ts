// salesStore.ts
import { proxy, snapshot } from 'valtio';
import { api_url } from '@/lib/utils';

export type SalesData = {
    data: Data[],
    schema: string[],
    errors: string[],
    cached: boolean
}
export type Data = {
    [key: string]: string | number;
}

export type SalesSettings = {
    data: Settings,
    errors: string[]
};

export type Settings = {
    [key: string] : ColumnSettings,
}

export type ColumnSettings = {
    column_name: string,
    hidden: boolean,
    display_name: string,
};

export type UserInput = {
    action: string, 
    action_owner: string, 
    additional_info: string
    id: string
    last_updated: string
    updated_by: string
}

export interface Store {
    sales_data: SalesData;
    sales_settings: Settings;
    user_input: UserInput[];
    loading: boolean;
    editing: boolean;
    table_view: string,
    expand_all: boolean,
    fetch_errors: string;
    orders_due_this_week: string[];
    orders_past_due: string[];
    fetchData: (cached_ok?:boolean) => Promise<void>;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Settings) => void;
    postSettings: () => Promise<void>;
}

const defaultUserInput: UserInput[] = []

const defaultSalesData: SalesData = {
    data: [],
    schema: [],
    errors: [],
    cached: false
};


const defaultSettings: Settings = {}

export const store = proxy<Store>({
    sales_data: defaultSalesData,
    sales_settings: defaultSettings,
    user_input: defaultUserInput,
    loading: false,
    editing: false,
    table_view: 'order',
    expand_all: true,
    fetch_errors: '',
    orders_due_this_week: [],
    orders_past_due: [],
    fetchData: async (cached_ok?:boolean) => {
        if (cached_ok === undefined) cached_ok = true
        store.loading = true;
        try {
            let endpoint = `${api_url}/all_items`
            if (!cached_ok) endpoint += "/no_cache"
            const response = await fetch(endpoint);
            const new_sales_data: SalesData = await response.json();
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
            const new_settings: Settings = await response.json();
            console.log({new_settings})
            store.sales_settings = new_settings;
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to update settings';
        }
        // store.loading = false;
        
    },
    updateSettings: (newSettings: Settings) => {
        store.sales_settings = { ...store.sales_settings, ...newSettings };
    },
    postSettings: async () => {
        store.loading = true;
        const settings_to_update = {items: Object.values(snapshot(store.sales_settings))}
        try {
            const response = await fetch(`${api_url}/update_item_settings_by_column_names`, {
                method: "POST",
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings_to_update)
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

store.fetchData().then(res => {
    console.log({res})
    store.fetchSettings().then(res => console.log({store}))
    
})
