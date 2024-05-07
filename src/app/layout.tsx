// import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getServerSession } from "next-auth";
import Providers from "@/components/layout/providers";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  return (
    <html lang="en" suppressHydrationWarning={true}>
        <body className={`${inter.className} overflow-hidden`}>
        <Providers session={session}>
              {children}
          <Toaster/>
        </Providers>
      </body>
    </html>
  );
}
