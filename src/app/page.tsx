"use client";

import { useState } from "react";
import StatCard from "@/components/StatCard";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import { Plus, Zap } from "lucide-react";

export default function Dashboard() {
  // Modal ko kholne aur band karne ki state
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back, Aliyan! 👋</h1>
          <p className="text-gray-500 mt-1 text-lg">Here's what's happening with AttendX today.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
        >
          <Plus size={20} />
          <span>Add Employee</span>
        </button>
      </div>
      
      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          label="Total Employees" 
          value="24" 
          subtext="Updated just now" 
        />
        <StatCard 
          label="Present Today" 
          value="18" 
          subtext="92% Attendance rate" 
          type="success" 
        />
        <StatCard 
          label="Absent Today" 
          value="06" 
          subtext="Includes 2 on leave" 
          type="danger" 
        />
        <StatCard 
          label="Monthly Expense" 
          value="Rs. 10" 
          subtext="Estimated payroll" 
        />
      </div>

      {/* Hero Action Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-[32px] p-8 text-white flex flex-col md:flex-row justify-between items-center overflow-hidden relative shadow-2xl shadow-blue-200">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
            <Zap size={14} className="fill-white" />
            <span className="text-xs font-bold uppercase tracking-wider">System Status</span>
          </div>
          <h3 className="text-2xl font-bold">Attendance is tracking live.</h3>
          <p className="opacity-80 max-w-md">
            Your employees are currently clocking in. The system is automatically calculating salaries and overtime in real-time.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 relative z-10">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg">
            View Live Logs
          </button>
        </div>

        {/* Decorative Circles */}
        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-white opacity-10 rounded-full"></div>
        <div className="absolute left-[10%] bottom-[-50px] w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-3xl"></div>
      </div>

      {/* Add Employee Modal Component */}
      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}