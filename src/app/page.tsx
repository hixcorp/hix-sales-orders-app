'use client'
import UserAuthForm from "@/components/forms/user-auth-form";
import Image from "next/image";

import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// Function to reload the page
function reloadPage() {
  location.reload();
}

// Listen for the "reload-page" event from Rust
listen('reload-page', () => {
  reloadPage();
});

export default function AuthenticationPage() {

  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col dark:bg-foreground dark:text-background p-10 dark:border-r lg:flex">
        <div className="absolute inset-0 " />
        <div className="mt-auto relative z-20 flex justify-center items-center text-lg font-medium">
          <Image src="/hixcorp_logo.png" height={100} width={300} alt="HIX Corporation" />
        </div>
          <div className="relative z-20 mt-auto flex items-end">
              <p className="text-sm pb-4">
                Welcome to HIX, © HIX Corporation, 2024
              </p>
        </div>
      </div>
      <div className="p-4 lg:p-8 h-full flex items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center items-center">
            
              
          <Image className='lg:hidden' src="/hixcorp_logo.png" height={50} width={150} alt="HIX Corporation" />
            
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to HIX
            </h1>
          </div>
          <UserAuthForm />

        </div>
      </div>
    </div>
  );
}
