"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Humein pata karna hai ke user kis page par hai
  const pathname = usePathname();
  
  // Agar user '/login' page par hai, toh hum 'isLoginPage' ko true kar denge
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en">
      <head>
        <title>AttendX — Track Time. Pay Right</title>
        <meta name="description" content="Premium Employee Attendance & Payroll System" />
      </head>
      <body className={inter.className}>
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
          
          {/* LOGIC: Agar login page NAHI hai, tabhi Sidebar dikhao */}
          {!isLoginPage && <Sidebar />}
          
          {/* Main Content Area */}
          <main className={`flex-1 transition-all duration-300 ${!isLoginPage ? "md:ml-64 p-4 md:p-8" : ""}`}>
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}