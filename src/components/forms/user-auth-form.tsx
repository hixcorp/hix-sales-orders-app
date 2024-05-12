"use client";
import AzureADSignInButton from "../auth/azure_ad_button";

export default function UserAuthForm() {
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
