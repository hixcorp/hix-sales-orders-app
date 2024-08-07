import { proxy, snapshot } from 'valtio';
import { server_url, server_ws_url } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { toast } from '@/components/ui/use-toast';
import UserInputNotify from '@/components/user_input/user_input_notification';
import { Session } from 'next-auth';
import WebSocket from "tauri-plugin-websocket-api";
import _ from 'lodash';
import { getCurrentUser } from '@/lib/session';

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
    connected:boolean,
    local_server:boolean,
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
    fetchData: (cached_ok?:boolean, setloading?:boolean) => Promise<void>;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Settings) => void;
    postSettings: () => Promise<void>;
    getAllowedValues: (field:string) => Promise<AllowedValue[]>;
    applyFilter: () => Promise<void>
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
    connected:false,
    local_server: false,
    current_user: null,
    sales_data: defaultSalesData,
    sales_settings: defaultSettings,
    user_input: defaultUserInput,
    loading: false,
    editing: false,
    progress: '',
    table_view: 'order',
    hg_filter:{},
    expand_all: false,
    fetch_errors: '',
    orders_due_this_week: [],
    orders_past_due: [],
    allowed_values: {},
    
    fetchData: async (cached_ok?:boolean, setloading?:boolean) => {
        store.progress = 'Loading sales order data from Macola HIXQL003'
        if (cached_ok === undefined) cached_ok = true
        if (setloading !== false) store.loading = true
        try {
            let endpoint = `${server_url}/all_items`
            if (!cached_ok) endpoint += "/no_cache"
            const response = await fetch(endpoint);
            const new_sales_data: SalesData = await response.json();
            store.sales_data = Object.assign(store.sales_data, new_sales_data);
            if (!store.connected) store.connected = true
            calculate_statistics()
        } catch (error) {
            console.error(error);
            store.connected = false
            store.fetch_errors = 'An error occurred while trying to fetch data';
        }finally{
            store.loading = false;
            store.progress = ''
        }
        
    },

    fetchSettings: async () => {
        store.progress = 'Loading column settings'
        try {
            const column_names = {column_names: Object.keys(store.sales_data.data[0])}
            const response = await fetch(`${server_url}/get_item_settings_by_column_names`,
                {
                    method: "POST",
                    headers: {
                    'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(column_names)
                }
            );
            const new_settings: Settings = await response.json();
            store.sales_settings = new_settings;
            if (!store.connected) store.connected = true
        } catch (error) {
            console.error(error);
            store.connected = false
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
            const response = await fetch(`${server_url}/update_item_settings_by_column_names`, {
                method: "POST",
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings_to_update)
            });
            await response.json();
            await store.fetchSettings();
            if (!store.connected ) store.connected = true
        } catch (error) {
            console.error(error);
            store.connected = false
            store.fetch_errors = 'An error occurred while trying to update settings';
        }
        store.loading = false;
        store.progress = ''
    },

    getAllowedValues: async (field:string)=>{
        let result:AllowedValue[]=[]
        try{
            const res = await fetch(`${server_url}/allowed_inputs/${field}`)
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

    applyFilter : async () => {
        console.log({store})
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

const _fetchUserInput = async () => { 
    try {
        const res = await fetch(`${server_url}/get_all_user_input`);
        const data: UserInput[] = await res.json();
        if (data instanceof(Array)) {
            store.user_input.splice(0, store.user_input.length, ...data);
        }
        if (!store.connected) store.connected = true;
    } catch (err) {
        console.warn({ err });
    }
};

export const fetchUserInput = _.debounce(_fetchUserInput, 250, {leading:true})

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


var ws: WebSocket | Promise<WebSocket>

export async function subscribe_to_updates() {
    console.log("CONNECTING TO SOCKET")
    const  address = `${server_ws_url}/ws/user_inputs`;
    try{
        ws = await WebSocket.connect(address)
    }catch(err){
        console.log("COULD NOT CONNECT TO WEBSOCKET. TRYING AGAIN")
        console.warn({err})
        ws = await WebSocket.connect(address)
        if (!ws) store.connected = false
    }
    if (ws) console.log("CONNECTED")
    
    ws.addListener((event) => {
        if (String(event.type) !== 'Ping'){
            let message = event.data as string
            let current_user = store.current_user?.user?.name ? store.current_user?.user?.name : ''
            let updated_by = ''
            try{
                const parsed_message: UserInput[] = JSON.parse(message)
                updated_by = parsed_message[0].updated_by
            }catch(err){
                console.warn({message,err,user:store.current_user, current_user})
            }
            let updated_by_current_user = current_user === updated_by
            if (updated_by === '') updated_by_current_user = false
            if (message && !updated_by_current_user){
                toast({
                                    title: "Order Updated",
                                    description: UserInputNotify({message}),
                                    duration: 25000
                                });
            }
                
            try{
                const orders_updates: UserInput[] = JSON.parse(message)
                for (let i = 0; i< orders_updates.length; i++){
                    const order = store.user_input.find(order => order.id === orders_updates[i].id)
                    if (order===undefined){                        
                        store.user_input.push(orders_updates[i])
                    }else{
                        if (!_.isEqual(order, orders_updates[i])){
                            try{
                                Object.assign(order,orders_updates[i])
                            }catch(err){
                                console.warn("COULD NOT ASSIGN ORDER UPDATES")
                            }
                        }   
                    }
                }
            }catch(err){
                console.warn("Could not update orders")
                console.warn({message,err,event})
            }
            }
    });

    return ws
}



if (typeof window !== 'undefined'){
    getCurrentUser().then(res=>store.current_user = !!res ? res : null)

    store.fetchData().then(res => {
        store.fetchSettings()
    })

    subscribe_to_updates().then(res => ws = res)

    setInterval(async ()=>{
        if (!ws){
            try{
                ws = await subscribe_to_updates()
                if (!store.connected ) store.connected = true
            }catch(err){
                store.connected = false
                console.error("Could not connect to websocket");
                toast({
                    title: "Lost Connection",
                    description: "Lost connection to updates, manually refresh to update data or restart application",
                    duration: 25000
                })
            }
        }
        store.fetchData(true, false).then(res=> fetchUserInput()).then(res =>store.fetchSettings())
    },1000*60*5)

    setInterval(async () => {
        try{
            const res = await fetch(`${server_url}/current_database`)
            if (res) store.connected = true
            else store.connected = false
        }catch{
            store.connected = false
        }
        
    },10000)
}


