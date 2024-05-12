"use client"

// import Link from "next/link"
import { User } from "next-auth"
// import { signOut } from "next-auth/react"
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
import { useEffect } from "react"

interface UserAccountNavProps extends React.HTMLAttributes<HTMLDivElement> {
  user: Pick<User, "name" | "image" | "email">
}

export function UserAccountNav(
  // { user }: UserAccountNavProps
) {
  const snap = useSnapshot(store)
  useEffect(()=>{
    getCurrentUser().then(res=>{
      if(!!res) {
        store.current_user = res
      }
    })

  },[])
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
            signOut(`${window.location.origin}`)
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}