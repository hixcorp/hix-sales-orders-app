
import { Button } from "@/components/ui/button"
import FileInputXML from "./file_input_xml"
import SalesOrderData from "./sales_orders/sales_order_data"
import { Suspense } from "react"
import ChangeDatabaseDirectory from "./change_db_dir"

export default function Home() {
  return (

      <>
      <header className=" h-auto bg-gray-100 dark:bg-gray-800 p-4 md:p-6 flex items-center justify-between">
        <FileInputXML/>
        <div className="flex flex-col items-center gap-4">
           <Button size="sm" variant="outline">
            <UploadIcon className="h-5 w-5 mr-2" />
            Upload Initial .xlsx
          </Button>
          
        </div>

      </header>
        <Suspense fallback={"Loading..."}>
            <SalesOrderData />
        </Suspense>
        {/* <ChangeDatabaseDirectory button_label="Change Database Location"/> */}
    </>    
  )
}

function DownloadIcon(props:any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}


function UploadIcon(props:any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  )
}



