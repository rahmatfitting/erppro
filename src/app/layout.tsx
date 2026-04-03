import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERP Pro - Dashboard & Management",
  description: "Modern Premium ERP Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" className="h-full bg-slate-50 dark:bg-slate-950">
      <body className={`${inter.className} h-full ${session ? 'overflow-hidden' : 'overflow-y-auto'} text-slate-900 dark:text-slate-50 antialiased`}>
        {session && (
           <script dangerouslySetInnerHTML={{
             __html: `window.__USER__ = ${JSON.stringify(session)};`
           }} />
        )}
        {session ? (
           <div className="flex h-screen w-full">
             {/* Desktop sidebar - hidden on mobile, visible lg+ */}
             <Sidebar user={session} />
             {/* Main content - full width on mobile, offset on desktop */}
             <div className="flex flex-1 flex-col overflow-hidden relative">
               <Header />
               <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 dark:bg-slate-950/50">
                 {/* Mobile top padding to prevent content hiding behind burger button */}
                 <div className="lg:hidden h-8 mb-2 shrink-0" />
                 <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                   {children}
                 </div>
               </main>
             </div>
           </div>
        ) : (
           children
        )}
      </body>
    </html>
  );
}
