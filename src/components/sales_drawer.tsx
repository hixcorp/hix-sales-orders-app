'use client'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "./ui/button"
import { Settings } from "lucide-react"

const SettingsDrawer = (
    {children}:{children:React.ReactNode}
) => {
    return(
        
        <Drawer >
            <DrawerTrigger asChild>
                    <Button className="p-1 py-3 color-gray-400 hover:text-white hover:fond-bold" variant="outline"><Settings/> Open Settings</Button>
                
            </DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                    <DrawerTitle>Database Settings</DrawerTitle>
                    <DrawerDescription>{"Change which database you're connected to for status updates"}</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        {children}
                    <DrawerClose>
                        <Button asChild variant="outline">Cancel</Button>
                    </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
        </Drawer>

    )
}

export default SettingsDrawer