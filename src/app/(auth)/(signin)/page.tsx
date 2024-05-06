import { Metadata } from "next";
import Link from "next/link";
import UserAuthForm from "@/components/forms/user-auth-form";
// import { buttonVariants } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
import Image from "next/image";
// import { getProviders } from "next-auth/react";
export const metadata: Metadata = {
  title: "HIX Authentication",
  description: "User Authentication for HIX Cloud",
};

// async function getproviders(){
//   const providers = await getProviders()
//   console.log("Providers", providers)
// }

export default function AuthenticationPage() {

  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col dark:bg-foreground dark:text-background p-10 dark:border-r lg:flex">
        <div className="absolute inset-0 " />
        <div className="mt-auto relative z-20 flex justify-center items-center text-lg font-medium">
          <Image src="/hixcorp_logo.png" height={100} width={300} alt="HIX Corporation" />
        </div>
          <div className="relative z-20 mt-auto flex items-end">
          
          <Image src={"/cloud_hixblue.svg"} height={75} width={75} alt=''/>
          
          
              <p className="text-sm pb-4">
                Welcome to HIX Cloud, © HIX Corporation, 2024
              </p>
            
        </div>
      </div>
      <div className="p-4 lg:p-8 h-full flex items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center items-center">
            
              
          <Image className='lg:hidden' src="/hixcorp_logo.png" height={50} width={150} alt="HIX Corporation" />
            
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to HIX Cloud
            </h1>
            {/* <p className="text-sm text-muted-foreground">
              Enter your email below to sign in or create your account
            </p> */}
          </div>
          <UserAuthForm />
          {/* <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p> */}
        </div>
      </div>
    </div>
  );
}
