"use client"
import { getCurrentUser, signOut } from "@/lib/session"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/auth/user_avatar"
import { useSnapshot } from "valtio"
import { store } from "@/store/sales_data_store"
import { redirect } from "next/navigation"
import { Suspense, useState } from "react"
import { Spinner } from "../ui/spinner"
import SettingsDrawer from "../sales_drawer"
import ChangeDatabaseDirectory from "../change_db_dir"


export function UserAccountNav() {
  const snap = useSnapshot(store)
  const [signoutError, setSignouterror] = useState('')
  const [loading, setLoading] = useState(false)
    if (!snap.current_user) getCurrentUser().then(res=>{
      if(!!res) {
        store.current_user = res
      }
    })

  const handleSignOut = async () => {

      try{
        setLoading(true)
        setSignouterror('')
        const res = await signOut()
        if (res) {redirect('/')}
        else{
          setSignouterror("Could not sign out")
        }
      }catch(err){
        setSignouterror('Could not sign out')
      }finally{
        setLoading(false)
        if (typeof window !== 'undefined') window.location.href = '/'
      }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <UserAvatar
          user={{ name: snap.current_user?.user?.name || null, image: snap.current_user?.user?.image || null }}
          className="h-8 w-8"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {snap.current_user?.user?.name && <p className="font-medium">{snap.current_user?.user.name}</p>}
            {snap.current_user?.user?.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {snap.current_user?.user?.email}
              </p>
            )}
          </div>
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault()
            handleSignOut()
          }}
        >
          <div className="flex flex-col">
          {loading ? <Spinner size={"small"}/> : <span>Sign out</span>}
          {signoutError && <span className='text-destructive text-xs'>{signoutError}</span>}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}