"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar"; 
import MobileNav from "@/components/MobileNav";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast"; 
import SplashScreen from "@/components/SplashScreen";

const inter = Inter({ subsets: ["latin"] });

function LayoutLogic({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  if (isLoginPage) return <div className="min-h-screen bg-gray-50">{children}</div>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 relative flex-col md:flex-row">
      
      {/* 🖥️ DESKTOP SIDEBAR */}
      <div className="hidden md:block">
        <Sidebar /> 
      </div>
      
      {/* MAIN CONTENT */}
      <main className={`flex-1 w-full min-w-0 transition-all duration-300 ease-in-out ${isCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        <div className="p-4 pb-28 md:p-12 md:pb-12 min-h-screen w-full">
          {children}
        </div>
      </main>

      {/* 🚀 Floating Mobile Nav */}
      <MobileNav />

    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-100 selection:text-blue-600`}>
        
        {/* 🔥 SAB KUCH EK HI PROVIDER MEIN WRAP HOGA 🔥 */}
        <AuthProvider>
          <SidebarProvider>
            
            {/* 💎 SPLASH SCREEN */}
            <SplashScreen />
            
            {/* 🔔 Notifications */}
            <Toaster position="top-center" />
            
            {/* 🧭 APP LOGIC & CHILDREN */}
            <LayoutLogic>{children}</LayoutLogic>

          </SidebarProvider>
        </AuthProvider>

      </body>
    </html>
  );
}