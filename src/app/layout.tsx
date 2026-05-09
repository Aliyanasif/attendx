import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { Toaster } from "react-hot-toast"; 
import SplashScreen from "@/components/SplashScreen";
import LayoutLogic from "@/components/LayoutLogic"; // Hum isay client component banayenge

const inter = Inter({ subsets: ["latin"] });

// ✅ Ab ye metadata 100% kaam karega kyunke ye file Server-side hai
export const metadata = {
  title: "AttendX",
  description: "Next-Gen Workforce Management Portal",
  manifest: "/manifest.json",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AttendX",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased selection:bg-blue-100 selection:text-blue-600`}>
        <AuthProvider>
          <SidebarProvider>
            <SplashScreen />
            <Toaster position="top-center" />
            
            {/* Saari client-side logic is component mein move kar di */}
            <LayoutLogic>{children}</LayoutLogic>

          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}