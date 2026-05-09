"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, Clock, CreditCard, Calendar as CalendarIcon, 
  ClipboardCheck, LogOut, ChevronRight, UserCircle,
  BarChart3, MapPin, History, Send, Menu 
} from "lucide-react";
import { auth, db } from "@/lib/firebase"; // 👈 'db' yahan add kiya hai
import { collection, query, where, onSnapshot } from "firebase/firestore"; // 👈 Firebase queries
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { userData } = useAuth();

  const role = userData?.role || "Staff";

  // 🔔 Pending Requests State
  const [pendingCount, setPendingCount] = useState(0);

  // 🚀 Firebase Live Listener for Pending Requests
  useEffect(() => {
    // Agar user Staff hai toh check mat karo
    if (role === "Staff") return;

    // Listen to Leaves
    const qLeaves = query(collection(db, "leaves"), where("status", "==", "Pending"));
    const unsubLeaves = onSnapshot(qLeaves, (snap) => {
      const leavesCount = snap.size;
      
      // Listen to Resignations inside so we can combine the count
      const qResign = query(collection(db, "resignations"), where("status", "==", "Pending"));
      const unsubResign = onSnapshot(qResign, (resSnap) => {
        setPendingCount(leavesCount + resSnap.size);
      });

      return () => unsubResign();
    });

    return () => unsubLeaves();
  }, [role]);

  const getMenuItems = () => {
    if (role === "Admin" || role === "Super Admin" || role === "Manager") {
      return [
        { icon: LayoutDashboard, label: "Dashboard", href: "/" },
        { icon: Clock, label: "Attendance Admin", href: "/attendance-mgmt" },
        // 👇 Yahan humne "badge" ki property add ki hai
        { icon: ClipboardCheck, label: "Requests Hub", href: "/requests-hub", badge: pendingCount > 0 },
        { icon: Send, label: "My Leave Portal", href: "/leaves" },
        { icon: BarChart3, label: "Staff Performance", href: "/performance" },
        ...(role !== "Super Admin" ? [{ icon: MapPin, label: "Clock In/Out", href: "/attendance" }] : []),
        { icon: Users, label: "Manage Staff", href: "/employees" },
        { icon: CreditCard, label: "Process Payroll", href: "/payroll" },
        { icon: History, label: "Salary History", href: "/salary-history" },
      ];
    }
    return [
      { icon: UserCircle, label: "My Profile", href: "/profile" },
      { icon: MapPin, label: "Clock In/Out", href: "/attendance" },
      { icon: CalendarIcon, label: "Full Calendar", href: "/calendar" },
      { icon: Send, label: "Leave Portal", href: "/leaves" },
    ];
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <aside 
      className={`bg-white border-r border-gray-100 h-screen fixed left-0 top-0 z-40 hidden md:flex flex-col shadow-sm transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64" 
      }`}
    >
      
      {/* 1. Header & Toggle Button */}
      <div className={`p-6 flex flex-col items-start gap-6 transition-all duration-300`}>
        <button 
          onClick={toggleSidebar}
          className={`p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors active:scale-95 ${isCollapsed ? "self-center" : "self-start"}`}
        >
          <Menu size={24} />
        </button>
        
        <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? "justify-center w-full" : "justify-start"}`}>
          <div className="w-12 h-12 min-w-[48px] bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-200">
            A
          </div>
          {!isCollapsed && (
            <span className="text-3xl font-black text-gray-900 tracking-tighter italic animate-in fade-in">AttendX</span>
          )}
        </div>
      </div>

      {/* 2. Navigation Menu */}
      <nav className={`flex-1 px-4 space-y-1 mt-6 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col ${isCollapsed ? "items-center" : "items-start"}`}>
        {!isCollapsed && (
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 mb-4 italic">
            {role === "Staff" ? "Employee Portal" : "Management Portal"}
          </p>
        )}
        
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center transition-all duration-300 group ${
                isCollapsed ? "justify-center w-12 h-12" : "justify-between px-5 py-4 w-full"
              } rounded-2xl ${
                isActive 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-100" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-4">
                
                {/* 🔴 Icon Wrapper with Collapsed Badge */}
                <div className="relative flex items-center justify-center">
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                  {item.badge && isCollapsed && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
                  )}
                </div>

                {/* 🔴 Label with Expanded Badge */}
                {!isCollapsed && (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <span className="font-bold text-[13px] tracking-tight whitespace-nowrap">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                    )}
                  </div>
                )}
              </div>
              
              {!isCollapsed && isActive && (
                <ChevronRight size={14} strokeWidth={3} className="animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Bottom Section */}
      <div className={`p-6 border-t border-gray-50 space-y-6 flex flex-col ${isCollapsed ? "items-center" : "items-start"}`}>
        <button 
          onClick={handleLogout}
          className={`flex items-center ${isCollapsed ? "justify-center w-12 h-12" : "gap-4 px-5 py-3 w-full"} text-red-500 font-black text-sm hover:bg-red-50 rounded-xl transition-all group`}
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
          {!isCollapsed && <span className="uppercase italic tracking-tighter animate-in fade-in">Sign Out</span>}
        </button>

        {/* // ✅ Naya Code (Sirf itna part replace karein): */}
              <Link 
                href="/profile-setup"
                className={`bg-gray-50 rounded-[28px] border border-gray-100 relative overflow-hidden transition-all duration-300 hover:border-blue-600 group ${isCollapsed ? "w-12 h-12 flex items-center justify-center" : "p-5 w-full flex items-center gap-4"}`}
              >
                <div className="w-12 h-12 min-w-[48px] rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                  {userData?.name ? userData.name[0] : "U"}
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden animate-in fade-in flex-1">
                    <p className="text-sm font-black text-gray-900 truncate italic leading-tight uppercase">
                      {userData?.name || "User"}
                    </p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1 italic flex items-center justify-between">
                      Profile Setup
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </p>
                  </div>
                )}
              </Link>
          </div>
        </aside>
      );
    }