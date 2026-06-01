"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Calendar as CalendarIcon,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useAuth();

  const role = userData?.role || "Staff";
  const OWNER_EMAIL = "aliyanasif503@gmail.com";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getNavItems = () => {
    let items: any[] = [];

    if (userData?.email === OWNER_EMAIL) {
      items.push({
        icon: ShieldCheck,
        label: "Command",
        href: "/owner-control",
      });
    }

    if (role === "Admin" || role === "Super Admin") {
      items.push(
        { icon: LayoutDashboard, label: "Home", href: "/" },
        { icon: Clock, label: "Admin", href: "/attendance-mgmt" },
        { icon: ClipboardCheck, label: "Requests", href: "/requests-hub" },
        { icon: Users, label: "Staff", href: "/employees" },
        { icon: BarChart3, label: "Stats", href: "/performance" },
        { icon: CreditCard, label: "Payroll", href: "/payroll" },
        { icon: History, label: "Salary", href: "/salary-history" }
      );

      return items;
    }

    if (role === "Manager") {
      items.push(
        { icon: LayoutDashboard, label: "Home", href: "/" },
        { icon: Clock, label: "Admin", href: "/attendance-mgmt" },
        { icon: ClipboardCheck, label: "Requests", href: "/requests-hub" },
        { icon: Send, label: "Leaves", href: "/leaves" },
        { icon: MapPin, label: "Punch", href: "/attendance" },
        { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
        { icon: BarChart3, label: "Stats", href: "/performance" },
        { icon: CreditCard, label: "Payroll", href: "/payroll" },
        { icon: History, label: "Salary", href: "/salary-history" }
      );

      return items;
    }

    items.push(
      { icon: UserCircle, label: "Profile", href: "/profile" },
      { icon: MapPin, label: "Punch", href: "/attendance" },
      { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
      { icon: Send, label: "Leaves", href: "/leaves" }
    );

    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100]">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl shadow-black/10 rounded-[32px] p-2 flex items-center overflow-x-auto no-scrollbar gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center gap-2.5 transition-all duration-500 ease-out shrink-0 rounded-full ${
                isActive
                  ? "bg-blue-600 text-white px-5 py-3.5 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  : "text-gray-400 p-3.5 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <item.icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? "animate-in zoom-in duration-300" : ""}
              />

              {isActive && (
                <span className="text-[13px] font-black tracking-wide animate-in fade-in slide-in-from-left-2 duration-300 whitespace-nowrap uppercase">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        <Link
          href={role === "Staff" ? "/profile" : "/profile-setup"}
          className={`flex items-center gap-3 transition-all duration-500 ease-out shrink-0 rounded-full px-4 py-2.5 ${
            pathname === "/profile" || pathname === "/profile-setup"
              ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              : "bg-gray-50 border border-gray-100 text-gray-900 hover:bg-gray-100"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black italic text-xs shadow-sm transition-colors ${
              pathname === "/profile" || pathname === "/profile-setup"
                ? "bg-white/20 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {userData?.name?.[0] || "U"}
          </div>

          <div className="flex flex-col pr-1">
            <span className="text-[11px] font-black uppercase italic leading-none truncate max-w-[100px]">
              {userData?.name || "User"}
            </span>
            <span
              className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${
                pathname === "/profile-setup" || pathname === "/profile-setup"
                  ? "text-blue-100"
                  : "text-blue-600"
              }`}
            >
              {role === "Staff" ? "My Profile" : "Setup Profile"}
            </span>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center transition-all duration-500 ease-out shrink-0 rounded-full text-red-400 p-3.5 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={22} strokeWidth={2.5} />
        </button>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}