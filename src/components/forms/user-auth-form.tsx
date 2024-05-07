"use client";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
// import GithubSignInButton from "../auth/github-auth-button";
import AzureADSignInButton from "../auth/azure_ad_button";

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
});

export default function UserAuthForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  
  const [loading, setLoading] = useState(false);


  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Continue with Microsoft
          </span>
        </div>
      </div>
      <AzureADSignInButton />
    </>
  );
}
