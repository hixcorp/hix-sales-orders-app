
"use client"
import SalesOrderData from "./sales_orders/sales_order_data"
import { Suspense } from "react"
import { CachedDataNotice } from "./sales_orders/cache_warnings"
import { Spinner } from "./ui/spinner"
import FileInputCSV from "./file_input_csv"
import { useSnapshot } from "valtio"
import { store } from "@/store/sales_data_store"
import { formatMoney } from "./sales_orders/collapsible_row"

export default function Home() {

  return (

      <>
      <div className=" p-2 py-0 md:p-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Hard Goods on Order by Requested Ship Date</h1>
        <TotalOrderValue/>
        <FileInputCSV/>
      </div>
        <Suspense fallback={<Spinner size={'large'}/>}>
            <CachedDataNotice/>
            <SalesOrderData />
        </Suspense>       
    </>    
  )
}

const TotalOrderValue = () => {
  const snap = useSnapshot(store)

  let source_data
    if (snap.sales_data && snap.sales_data.filtered_data.length > 0){
        source_data = snap.sales_data.filtered_data 
    }else{
        source_data = snap.sales_data.data
    }

    let total_value = 0.0
    source_data.forEach(row => {
      total_value += Number(row.unit_price) * Number(row.qty_to_ship)
    })

    return(
      <h2 className="font-bold">Total Cost of Shown Items: <span className="text-blue-500">{formatMoney(total_value)}</span></h2>
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



