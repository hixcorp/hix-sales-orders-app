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
import { Settings, TriangleAlert } from "lucide-react"
import { local_api_url, server_url } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import { store } from "@/store/sales_data_store"
import HoverTooltip from "./tooltip"

const SettingsDrawer = (
    {children}:{children:React.ReactNode}
) => {
    const snap = useSnapshot(store)
    return(
        
        <Drawer >
            <DrawerTrigger asChild>
                    <Button className="p-1 py-3 color-gray-400 hover:text-white hover:fond-bold" variant="ghost">
                        <Settings className={snap.connected ? '' : 'text-destructive'}/>
                        {snap.local_server && 
                        <HoverTooltip content="Not connected to shared server. Not receiving updates">
                            <TriangleAlert className="text-yellow-400"/>
                        </HoverTooltip>
                        
                        }
                    </Button>
                
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