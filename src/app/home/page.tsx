
'use client'
import dynamic from "next/dynamic";
import Home from "@/components/home";

const FileInput = dynamic(
  () => import("@/components/file_input_csv"),
  {
    ssr: false,
  }
);

export default function Page() {
  return (
    <Home/> 
      
      );
}

