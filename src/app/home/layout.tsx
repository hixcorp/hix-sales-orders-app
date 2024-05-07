import { UserAccountNav } from "@/components/auth/use-login";
import { Navigation } from "@/components/layout/navigation";
import { getCurrentUser } from "@/lib/session";
import type { Metadata } from "next";

import Image from "next/image";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "HIX Sales Orders App",
  description: "Created by HIX Corporation (c) 2024",
};

export default async function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser()
    if (!user) {
    return notFound()
  }
  return (
      <>
          <div className='absolute inset-0 min-h-screen min-w-screen max-w-full h-full p-5 flex flex-col max-h-screen '>

            <div className="z-10 w-full items-center justify-between text-sm lg:flex">
                <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
                  <a
                    className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
                    href="https://hixcorp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    
                    <Image
                      src="/hixcorp_logo.png"
                      alt="HIX Logo"
                      className="dark:invert"
                      width={100}
                      height={24}
                      priority
                    />
                  </a>
                </div>
               <div className="flex items-center gap-8">
               <Navigation/> 
               <UserAccountNav user={user}/>
               </div>
            </div>
                {children}
          </div>
    </>
  );
}
