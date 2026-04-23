"use client";
import Link from "next/link"; // Ye line add karo
import { usePathname } from "next/navigation"; // Ye check karne ke liye ke hum kis page par hain
import { LayoutDashboard, Users, Clock, CreditCard, Calendar as CalendarIcon, Settings } from "lucide-react";

// menuItems mein ye add karo:
const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Users, label: "Employees", href: "/employees" },
  { icon: Clock, label: "Attendance", href: "/attendance" },
  { icon: CalendarIcon, label: "Calendar", href: "/calendar" }, // Naya Option
  { icon: CreditCard, label: "Payroll", href: "/payroll" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen p-4 flex flex-col fixed left-0 top-0">
      <div className="flex items-center gap-2 px-2 py-6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
        <span className="text-xl font-bold tracking-tight text-gray-900">AttendX</span>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
              pathname === item.href 
                ? "bg-blue-50 text-blue-600 font-semibold" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {/* ... baaki user account wala code wahi rehne do ... */}
    </div>
  );
}