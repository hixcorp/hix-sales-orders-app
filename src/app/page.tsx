

import dynamic from "next/dynamic";
import Home from "@/components/home_1";

const FileInput = dynamic(
  () => import("@/components/file_input_xml"),
  {
    ssr: false,
  }
);

export default function Page() {
  return (
      <Home/> 
      
      );
}

