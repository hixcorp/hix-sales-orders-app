"use client";
import React from "react";
import ThemeProvider from "./ThemeToggle/theme-provider";
// import { SessionProvider, SessionProviderProps } from "next-auth/react";
import ZoomProvider from "./zoom-provider";
export default function Providers({
  // session,
  children,
}: {
  // session: SessionProviderProps["session"];
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {/* <SessionProvider session={session}> */}
          <ZoomProvider>
            {children}
          </ZoomProvider>
        {/* </SessionProvider> */}
      </ThemeProvider>
    </>
  );
}
