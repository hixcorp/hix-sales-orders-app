
"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Icons } from "../icons";

export default function AzureADSignInButton() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  return (
    <Button
      className="w-full"
      variant="outline"
      type="button"
      onClick={() =>
        signIn("azure-ad", { callbackUrl: callbackUrl ?? "/home" })
      }
    >
      <Icons.azureAD className="mr-2 h-4 w-4" />
      <p>Microsoft</p>
    </Button>
  );
}
