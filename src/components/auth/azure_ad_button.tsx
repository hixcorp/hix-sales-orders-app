
"use client";
import { Button } from "@/components/ui/button";
import { Icons } from "../icons";
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { api_url } from "@/lib/utils";
import Link from "next/link";

const auth_url = `${api_url}/start-auth?callbackUrl=${encodeURIComponent("http://localhost:8000/home")}`

export default function AzureADSignInButton() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
      setLoading(true)
  }

  return (
    <Link href={auth_url}>
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
    </Link>
    
  );
}
