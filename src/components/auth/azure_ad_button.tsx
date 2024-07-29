
"use client";
import { Button } from "@/components/ui/button";
import { Icons } from "../icons";
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { local_api_url } from "@/lib/utils";
import { redirect } from "next/navigation";

const auth_url = `${local_api_url}/start-auth?callbackUrl=${encodeURIComponent("http://localhost:8000/home")}`

export default function AzureADSignInButton() {
  const [loading, setLoading] = useState(false)
  const [signInError, setSignInError] = useState(false) 
  const sleepNow = (delay:number) => new Promise((resolve) => setTimeout(resolve, delay))
  const handleLogin = async () => {

      if (typeof window === 'undefined') return
      setLoading(true)
      let backend_loaded = false
      let timeout = false
      setTimeout(()=>{timeout = true},10000)
      while (!backend_loaded && !timeout){
        
        const res = await fetch(`${local_api_url}/current_database`).catch(err=>console.warn(err))
        await sleepNow(1000)
        console.log({backend_loaded, timeout, break:!backend_loaded || !timeout,res})
        if (res) backend_loaded = true
      }

      if (backend_loaded){
        // redirect(auth_url)
        window.location.href = auth_url
      }else{
        setSignInError(true)
        setLoading(false)
      }
  }

  return (
    <div className="flex flex-col items-center">
      <Button
        className="w-full flex gap-2 bg-accent text-accent-foreground hover:bg-accent/80"
        variant="outline"
        type="button"
        onClick={handleLogin}
      >
        {loading && <Spinner size={'medium'} className="text-primary-foreground"/>}
        <Icons.azureAD className="mr-2 h-4 w-4" />
        <p>Microsoft</p>
      </Button>
      {signInError && <span className="text-destructive">An error occured trying to login. Try again.</span>}
    </div>
  );
}
