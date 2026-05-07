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
import Link from "next/link";
import { Toaster } from "react-hot-toast"; 

const inter = Inter({ subsets: ["latin"] });

function LayoutLogic({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  // Navigation Links for Mobile Navbar
  const navLinks = [
    { name: "My Profile", path: "/profile" },
    { name: "Attendance", path: "/attendance" },
    { name: "Requests", path: "/requests-hub" },
    { name: "Payroll", path: "/payroll" },
    { name: "Performance", path: "/performance" },
    { name: "Employees", path: "/employees" },
  ];

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
      
      {/* 📱 MOBILE TOP NAV (Sirf Mobile par dikhega) */}
      {/* <nav className="md:hidden sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-black italic text-blue-600 text-xl tracking-tighter uppercase">AttendX</h1>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs italic">
            {userData?.name?.[0] || "U"}
          </div>
        </div>
        
        {/* Scrolling Links */}
        {/* <div className="flex overflow-x-auto no-scrollbar px-4 pb-3 gap-6 scroll-smooth">
          {navLinks.map((link) => (
            <Link 
              key={link.path} 
              href={link.path}
              className={`whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all ${
                pathname === link.path ? "text-blue-600 border-b-2 border-blue-600 pb-1" : "text-gray-400"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      // </nav> */} 

      {/* 🖥️ DESKTOP SIDEBAR (Mobile par hidden hoga) */}
      <div className="hidden md:block">
        <Sidebar /> 
      </div>
      
      {/* MAIN CONTENT */}
      {/* 👇 YAHAN FIX KIYA HAI: className="..." hata kar pl-20 / pl-64 lagaya hai taake overlap na ho */}
      <main className={`flex-1 w-full min-w-0 transition-all duration-300 ease-in-out ${isCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        <div className="p-4 pb-28 md:p-12 md:pb-12 min-h-screen w-full">
          {children}
        </div>
      </main>

      {/* 🚀 Naya Floating Mobile Nav */}
      <MobileNav />

      {/* 👇 AAPKA PURANA COMMENTED MAIN CODE */}
      {/* <main 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:ml-24" : "md:ml-64"
        }`}
      >
        <div className="p-4 md:p-12 min-h-screen w-full">
          {children}
        </div>
      </main> */}
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-100 selection:text-blue-600`}>
        {/* 🔔 Ye Toaster poori app mein Notifications handle karega */}
        <Toaster position="top-center" />
        
        <AuthProvider>
          <SidebarProvider>
            <LayoutLogic>{children}</LayoutLogic>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}