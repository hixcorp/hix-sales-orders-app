
"use client"
import SalesOrderData from "./sales_orders/sales_order_data"
import { Suspense, useEffect } from "react"
import ChangeDatabaseDirectory from "./change_db_dir"
import SettingsDrawer from "./sales_drawer"
import { CachedDataNotice } from "./sales_orders/cache_warnings"
import { Spinner } from "./ui/spinner"
import FileInputCSV from "./file_input_csv"
import { store} from "@/store/sales_data_store"
import { getCurrentUser } from "@/lib/session"

export default function Home() {
  useEffect(()=>{
    getCurrentUser().then(res=>store.current_user = !!res ? res : null)

  },[])
  return (

      <>
      <header className=" h-auto p-2 md:p-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Hard Goods on Order by Requested Ship Date</h1>
        <FileInputCSV/>
      </header>
        <Suspense fallback={<Spinner size={'large'}/>}>
            <CachedDataNotice/>
            <SalesOrderData />
        </Suspense>
        <div className="p-2 w-full">
        <SettingsDrawer>
          <Suspense fallback={<Spinner size={'large'}/>}>
          <ChangeDatabaseDirectory />
          </Suspense>
        </SettingsDrawer>
        </div>
        
    </>    
  )
}

// function DownloadIcon(props:any) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
//       <polyline points="7 10 12 15 17 10" />
//       <line x1="12" x2="12" y1="15" y2="3" />
//     </svg>
//   )
// }


// function UploadIcon(props:any) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
//       <polyline points="17 8 12 3 7 8" />
//       <line x1="12" x2="12" y1="3" y2="15" />
//     </svg>
//   )
// }



