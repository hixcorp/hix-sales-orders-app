'use client'

import { User } from "next-auth"
import { AvatarProps } from "@radix-ui/react-avatar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/icons"
import { User as UserIcon} from "lucide-react"
import { Spinner } from "../ui/spinner"

interface UserAvatarProps extends AvatarProps {
  user: Pick<User, "image" | "name">
}

export function UserAvatar({ user, ...props }: UserAvatarProps) {
  const name_segments = user.name?.split(' ')
  return (
    <Avatar {...props}>
      {user.image ? (
        <AvatarImage alt="Picture" src={user.image} />
      ) : (
        <AvatarFallback className="bg-primary text-primary-foreground">
          {name_segments ? `${name_segments[0][0]}${name_segments[1][0]}` : "USER"}
        </AvatarFallback>
      )}
    </Avatar>
  )
}