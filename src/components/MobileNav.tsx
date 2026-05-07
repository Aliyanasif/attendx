"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Clock, 
  Send, 
  UserCircle, 
  ClipboardCheck, 
  Users,
  BarChart3,
  CreditCard,
  History,
  MapPin,
  Calendar as CalendarIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function MobileNav() {
  const pathname = usePathname();
  const authContext = useAuth();

  if (!authContext) return null;

  const { userData } = authContext;
  const role = userData?.role || "Staff";

  // 🛡️ Bilkul Sidebar wale options role ke hisaab se[cite: 6]
  const getNavItems = () => {
    if (role === "Admin" || role === "Super Admin" || role === "Manager") {
      return [
        { icon: LayoutDashboard, label: "Home", href: "/" },
        { icon: Clock, label: "Admin", href: "/attendance-mgmt" },
        { icon: ClipboardCheck, label: "Requests", href: "/requests-hub" },
        { icon: Send, label: "Leaves", href: "/leaves" },
        { icon: BarChart3, label: "Stats", href: "/performance" },
        ...(role !== "Super Admin" ? [{ icon: MapPin, label: "Punch", href: "/attendance" }] : []),
        { icon: Users, label: "Staff", href: "/employees" },
        { icon: CreditCard, label: "Payroll", href: "/payroll" },
        { icon: History, label: "Salary", href: "/salary-history" },
      ];
    }
    // Staff ke options
    return [
      { icon: UserCircle, label: "Profile", href: "/profile" },
      { icon: MapPin, label: "Punch In/Out", href: "/attendance" },
      { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
      { icon: Send, label: "Leave Portal", href: "/leaves" },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100]">
      {/* 🚀 Glassmorphism Dark Container (Picture Wala Design) */}
      <div className="bg-[#ffffff]/95 backdrop-blur-x1 border border-white/10 shadow-2xl shadow-black/40 rounded-[32px] p-2 flex items-center overflow-x-auto no-scrollbar gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              // Active aur Inactive state ki smooth animation
              className={`flex items-center justify-center gap-2.5 transition-all duration-500 ease-out shrink-0 rounded-full ${
                isActive 
                  ? 'bg-blue-600 text-white px-5 py-3.5 shadow-[0_0_20px_rgba(37,99,235,0.4)]' 
                  : 'text-gray-400 p-3.5 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={isActive ? "animate-in zoom-in duration-300" : ""} 
              />
              
              {/* Sirf Active tab par Text show hoga */}
              {isActive && (
                <span className="text-[13px] font-black tracking-wide animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Hide Scrollbar CSS */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}