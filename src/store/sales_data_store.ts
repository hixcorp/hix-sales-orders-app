import { proxy, snapshot } from 'valtio';
import { api_url, ws_url } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { toast } from '@/components/ui/use-toast';
import { message } from '@tauri-apps/api/dialog';
import UserInputNotify from '@/components/user_input/user_input_notification';
import { Session } from 'next-auth';

export type SalesData = {
    data: Data[],
    filtered_data: Data[],
    schema: string[],
    errors: string[],
    cached: boolean,
    cache_date:string
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
    id: string
    order_status: string
    action: string, 
    action_owner: string, 
    additional_info: string
    last_updated: string
    updated_by: string
}

export interface Store {
    current_user: Session | null
    sales_data: SalesData;
    sales_settings: Settings;
    user_input: UserInput[];
    loading: boolean;
    editing: boolean;
    progress: string;
    table_view: string,
    hg_filter: {[key:string]:string | DateRange},
    expand_all: boolean,
    fetch_errors: string;
    orders_due_this_week: string[];
    orders_past_due: string[];
    allowed_values: {[key:string]:AllowedValue[]}
    fetchData: (cached_ok?:boolean) => Promise<void>;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Settings) => void;
    postSettings: () => Promise<void>;
    getAllowedValues: (field:string) => Promise<AllowedValue[]>;
    applyFilter: () => void
}

export type AllowedValue = {
    id: number,
    type:string,
    value: string,
}
export type AllowedValueCreate = {
    type:string,
    value:string
}

const defaultUserInput: UserInput[] = []

const today = new Date(Date.now())
const defaultSalesData: SalesData = {
    data: [],
    filtered_data:[],
    schema: [],
    errors: [],
    cached: false,
    cache_date: `${today.toLocaleDateString()} ${today.toLocaleTimeString()}`
};


const defaultSettings: Settings = {}

export const store = proxy<Store>({
    current_user: null,
    sales_data: defaultSalesData,
    sales_settings: defaultSettings,
    user_input: defaultUserInput,
    loading: false,
    editing: false,
    progress: '',
    table_view: 'order',
    hg_filter:{},
    expand_all: true,
    fetch_errors: '',
    orders_due_this_week: [],
    orders_past_due: [],
    allowed_values: {},
    
    fetchData: async (cached_ok?:boolean) => {
        store.progress = 'Loading sales order data from Macola HIXQL003'
        if (cached_ok === undefined) cached_ok = true
        store.loading = true;
        try {
            let endpoint = `${api_url}/all_items`
            if (!cached_ok) endpoint += "/no_cache"
            const response = await fetch(endpoint);
            const new_sales_data: SalesData = await response.json();
            store.sales_data = Object.assign(store.sales_data, new_sales_data);
            calculate_statistics()
        } catch (error) {
            console.error(error);
            store.fetch_errors = 'An error occurred while trying to fetch data';
        }
        store.loading = false;
        store.progress = ''
    },

    fetchSettings: async () => {
        store.progress = 'Loading column settings'
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
        store.progress = ''
        
    },

    updateSettings: (newSettings: Settings) => {
        store.sales_settings = { ...store.sales_settings, ...newSettings };
    },

    postSettings: async () => {
        store.loading = true;
        store.progress = 'Saving column settings'
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
        store.progress = ''
    },

    getAllowedValues: async (field:string)=>{
        let result:AllowedValue[]=[]
        try{
            const res = await fetch(`${api_url}/allowed_inputs/${field}`)
            if (res.ok){
                const allowed_values: AllowedValue[] = await res.json()
                return allowed_values
            }
            else {
                return result
            }
        }catch(err){
            console.warn({err})
           
            return result
        }
    },

    applyFilter : () => {
        store.sales_data.filtered_data = store.sales_data.data.filter((row) =>
            Object.entries(store.hg_filter).every(([column, filter]) =>{
                if (typeof filter === 'string') {
                    return filter === '' || row[column]?.toString().toLowerCase().includes(filter.toLowerCase());
                } else if (filter && filter.from && filter.to) {
                    const dateVal = new Date(row[column]);
                    return dateVal >= filter.from && dateVal <= filter.to;
                }
                return true;
            }
            )
        );
    }
});


function calculate_statistics() {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const ordersMap = new Map();
    store.sales_data.data.forEach((row) => {
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
    store.fetchSettings().then(res => {
        console.log({store})
        const ws = subscribe_to_updates()
    })
})

export function subscribe_to_updates() {
    console.log("CONNECTING")
    const  address = `${ws_url}/ws/user_inputs`;
    const ws = new WebSocket(address);
    
    ws.onopen = function() {
        console.log("Opened websocket connection");
    };

    ws.onmessage = function(event) {
        let message = event.data

        toast({
            title: "Order Updated",
            description: UserInputNotify({message}),
            duration: 250000
        });

    };

    ws.onclose = function() {
        console.log("> Closed websocketconnection");
    };

    ws.onerror = function(error) {
        console.log({error})
        console.log(`Could not connect to ${address}`);
    };

    return ws
}

