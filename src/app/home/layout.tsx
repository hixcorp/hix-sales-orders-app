'use client'
import { UserAccountNav } from "@/components/auth/use-login";
import ChangeServer from "@/components/change_server";
import { Navigation } from "@/components/layout/navigation";
import SettingsDrawer from "@/components/sales_drawer";
import { Spinner } from "@/components/ui/spinner";
import { store } from "@/store/sales_data_store";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { useSnapshot } from "valtio";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const snap = useSnapshot(store)
  if (snap.current_user === null) redirect("/")
  return (
      <>
          <div className='absolute inset-0 min-h-screen min-w-screen max-w-full h-full p-5 flex flex-col '>

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
               <UserAccountNav/>
               <SettingsDrawer>
                <Suspense fallback={<Spinner size={'large'}/>}>
                <ChangeServer/>
                </Suspense>
              </SettingsDrawer>
               </div>
            </div>
                {children}
          </div>
    </>
  );
}
