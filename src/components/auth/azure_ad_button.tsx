
"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Icons } from "../icons";
import { useState } from "react";
import { Spinner } from "../ui/spinner";

export default function AzureADSignInButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
      setLoading(true)
      signIn("azure-ad", { callbackUrl: callbackUrl ?? "/home" })//.then(res => setLoading(false))
  }

  return (
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
  );
}
