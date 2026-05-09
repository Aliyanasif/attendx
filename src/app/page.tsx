"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore"; // 👈 query, where added
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { 
  Users, Banknote, UserCheck, UserX, 
  ExternalLink, X, Mail, Briefcase, Loader2, 
  ShieldCheck, Activity, CalendarDays, ArrowRight
} from "lucide-react";

export default function ManagerDashboard() {
  // 🛡️ SECURITY GUARD START -----------------------
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Agar Staff hai, toh foran usko uski Profile par phenk do
    if (userData?.role === "Staff") {
      router.replace("/profile");
    }
  }, [userData, router]);
  // 🛡️ SECURITY GUARD END -------------------------

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    // Agar data nahi hai ya role Staff hai toh roko
    if (!userData?.uid || userData?.role === "Staff") return;

    // 🛡️ 1. Live Employees Fetching (FILTERED BY ADMIN)
    const empQuery = query(collection(db, "employees"), where("adminUid", "==", userData.uid));
    const unsubEmp = onSnapshot(empQuery, (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 🛡️ 2. Live Today's Attendance Fetching (FILTERED BY ADMIN)
    const attQuery = query(collection(db, "attendance"), where("adminUid", "==", userData.uid));
    const unsubAtt = onSnapshot(attQuery, (snap) => {
      const todayAtt = snap.docs
        .map(doc => doc.data())
        .filter(att => att.date === today);
      setAttendance(todayAtt);
      setLoading(false);
    });

    return () => { unsubEmp(); unsubAtt(); };
  }, [today, userData]); // 👈 Dependencies updated

  if (authLoading || (loading && userData?.role !== "Staff")) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  if (userData?.role === "Staff") {
    return null; 
  }

  // Logic for Lists
  const presentStaff = employees.filter(emp => attendance.some(att => att.employeeName === emp.name));
  const absentStaff = employees.filter(emp => !attendance.some(att => att.employeeName === emp.name));
  const totalSalaries = employees.reduce((acc, curr) => acc + (parseFloat(curr.salary) || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-24 px-4 mt-4">
      
      {/* 🚀 1. MASSIVE ATTENDX HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
            Attend<span className="text-blue-600">X</span>
          </h1>
          <p className="text-gray-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] ml-1 mt-2 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" /> Next-Gen Workforce Management
          </p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={24} />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Today's Date</p>
            <p className="font-bold text-gray-900 text-sm italic">{displayDate}</p>
          </div>
        </div>
      </div>

      {/* 📊 2. TOP PREMIUM STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Employees (Blue Gradient) */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[40px] shadow-xl shadow-blue-900/20 flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-white/20 p-3 rounded-2xl text-white backdrop-blur-md"><Users size={24} /></div>
            <Activity size={20} className="text-blue-300 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none mb-2">Total Workforce</p>
            <h4 className="text-5xl font-black italic text-white tracking-tighter">{employees.length}</h4>
          </div>
        </div>

        {/* Monthly Salaries (Dark Card) */}
        <div className="bg-gray-900 p-8 rounded-[40px] shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-white/10 p-3 rounded-2xl text-white backdrop-blur-md"><Banknote size={24} /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Est. Liability</p>
            <h4 className="text-4xl font-black italic text-white tracking-tighter">Rs {totalSalaries.toLocaleString()}</h4>
          </div>
        </div>

        {/* Present Today (White/Green) */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-green-200 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-green-50 p-3 rounded-2xl text-green-600"><UserCheck size={24} /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Active Today</p>
            <h4 className="text-5xl font-black italic text-gray-900 tracking-tighter">{presentStaff.length}</h4>
          </div>
        </div>

        {/* Absent Today (White/Red) */}
        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between group hover:border-red-200 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600"><UserX size={24} /></div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Missing/Absent</p>
            <h4 className="text-5xl font-black italic text-gray-900 tracking-tighter">{absentStaff.length}</h4>
          </div>
        </div>

      </div>

      {/* 🟢🔴 3. ATTENDANCE LISTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PRESENT LIST */}
        <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-green-50/30">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span> Present Now
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Live Active Staff</p>
            </div>
            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-xs font-black italic">{presentStaff.length}</span>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
            {presentStaff.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold italic text-sm">No staff clocked in yet.</div>
            ) : (
              presentStaff.map(emp => (
                <div key={emp.id} onClick={() => { setSelectedStaff(emp); setIsProfileOpen(true); }} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[24px] hover:border-green-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-[18px] text-green-600 flex items-center justify-center font-black italic text-xl group-hover:bg-green-600 group-hover:text-white transition-colors">{emp.name[0]}</div>
                    <div>
                      <p className="font-black text-gray-900 uppercase italic text-sm leading-none">{emp.name}</p>
                      <p className="text-[10px] font-bold text-green-500 uppercase mt-1 tracking-widest">{emp.designation || "Staff"}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* ABSENT LIST */}
        <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-red-50/30">
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Missing / Absent
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Not Reported Today</p>
            </div>
            <span className="bg-red-100 text-red-700 px-4 py-2 rounded-2xl text-xs font-black italic">{absentStaff.length}</span>
          </div>
          <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
            {absentStaff.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold italic text-sm">Everyone is present! 🎉</div>
            ) : (
              absentStaff.map(emp => (
                <div key={emp.id} onClick={() => { setSelectedStaff(emp); setIsProfileOpen(true); }} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[24px] hover:border-red-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 rounded-[18px] text-red-600 flex items-center justify-center font-black italic text-xl group-hover:bg-red-600 group-hover:text-white transition-colors">{emp.name[0]}</div>
                    <div>
                      <p className="font-black text-gray-900 uppercase italic text-sm leading-none">{emp.name}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase mt-1 tracking-widest">{emp.designation || "Staff"}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 💳 4. PREMIUM PROFILE ID CARD MODAL */}
      {isProfileOpen && selectedStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden relative animate-in zoom-in duration-300 border border-white/20">
            {/* Header Pattern */}
            <div className="bg-gray-900 h-32 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              <button onClick={() => setIsProfileOpen(false)} className="absolute top-6 right-6 text-white hover:bg-white/20 p-2 rounded-full transition-all z-10">
                <X size={20} />
              </button>
            </div>
            
            <div className="px-8 pb-8 -mt-16 relative flex flex-col items-center">
              {/* Avatar */}
              <div className="w-28 h-28 bg-white rounded-[32px] p-2 shadow-xl mb-4">
                <div className="w-full h-full bg-blue-600 rounded-[24px] flex items-center justify-center text-white text-4xl font-black italic">
                  {selectedStaff.name[0]}
                </div>
              </div>
              
              <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none text-center">{selectedStaff.name}</h2>
              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest mt-3 border border-blue-100">
                {selectedStaff.designation || "Staff"}
              </span>

              <div className="w-full mt-8 space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 text-gray-500"><Mail size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Email</span></div>
                  <span className="font-bold text-gray-900 text-xs">{selectedStaff.email}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3 text-gray-500"><Briefcase size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Role</span></div>
                  <span className="font-bold text-gray-900 text-xs">{selectedStaff.role}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 text-blue-600"><Banknote size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Base Salary</span></div>
                  <span className="font-black text-blue-700 text-sm italic tracking-tighter">Rs {selectedStaff.salary}</span>
                </div>
              </div>

              <button onClick={() => setIsProfileOpen(false)} className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">
                Close ID Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}