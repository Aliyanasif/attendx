"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore"; 
import { useAuth } from "@/context/AuthContext"; 
import { TrendingUp, Clock, AlertCircle, Award, User, BarChart3, Loader2, Lock } from "lucide-react"; 

export default function PerformancePage() {
  const { userData, loading: authLoading } = useAuth(); 
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [overallPunctuality, setOverallPunctuality] = useState(0);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center text-gray-900"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  // 🛡️ SECURITY: Staff access blocked
  if (userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500 text-gray-900">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter">Access Denied</h2>
        <p className="text-gray-500 font-bold mt-4 max-w-sm italic">Bhai, ye area sirf Management ke liye reserved hai. Aapka access restricted hai.</p>
      </div>
    );
  }

  useEffect(() => {
    // 🛡️ Multi-Tenant Check
    if (!userData?.uid || userData?.role === "Staff") return;

    const fetchPerformance = async () => {
      try {
        // 1. Fetch Employees to get their actual shift timings
        const empQuery = query(collection(db, "employees"), where("adminUid", "==", userData.uid));
        // 2. Fetch Attendance records
        const attQuery = query(collection(db, "attendance"), where("adminUid", "==", userData.uid));
        
        const [empSnap, attSnap] = await Promise.all([getDocs(empQuery), getDocs(attQuery)]);
        
        // Employee Shift Map banayen (Name -> Shift Start Time)
        const empShifts: Record<string, string> = {};
        empSnap.docs.forEach(doc => {
          const data = doc.data();
          empShifts[data.name] = data.shiftStart || "09:00"; // Default 9AM agar set nahi hai
        });

        const records = attSnap.docs.map(doc => doc.data());

        const employeeMap: any = {};
        let totalLate = 0;
        let validRecordsCount = 0;

        records.forEach((rec: any) => {
          // Sirf un records ko count karein jahan clockIn majood ho
          if (!rec.clockIn) return;

          validRecordsCount++;

          if (!employeeMap[rec.employeeName]) {
            employeeMap[rec.employeeName] = { name: rec.employeeName, total: 0, late: 0 };
          }
          employeeMap[rec.employeeName].total += 1;
          
          // ⏱️ THE 15-MINUTE LATE LOGIC 
          const shiftStart = empShifts[rec.employeeName] || "09:00";
          const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number);
          
          const clockInDate = rec.clockIn.toDate(); // Firebase timestamp to JS Date
          
          // Ussi din ka target time banayen jo shift timing hai
          const targetTime = new Date(clockInDate.getTime());
          targetTime.setHours(shiftHour, shiftMinute, 0, 0);

          // Grace Period: Shift Time + 15 Minutes
          const gracePeriodMs = 15 * 60 * 1000; 
          const lateThreshold = new Date(targetTime.getTime() + gracePeriodMs);

          // Agar clock-in time 15 minute ke grace period se oopar hai, toh Late mark karo
          if (clockInDate > lateThreshold) {
            employeeMap[rec.employeeName].late += 1;
            totalLate += 1;
          }
        });

        const performanceArray = Object.values(employeeMap);
        setStats(performanceArray);

        // Calculate Overall Punctuality based on this new logic
        const punctuality = validRecordsCount > 0 ? ((validRecordsCount - totalLate) / validRecordsCount) * 100 : 0;
        setOverallPunctuality(Math.round(punctuality));

      } catch (err) { 
        console.error("Performance fetch error:", err); 
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [userData]); 

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-900"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4 text-gray-900">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase leading-none">
            Staff <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2">Deep dive into team punctuality and work patterns.</p>
        </div>
        <div className="bg-white px-8 py-4 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Punctuality</p>
            <p className="text-2xl font-black text-blue-600">{overallPunctuality}%</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-50">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.length > 0 ? (
          stats.sort((a, b) => a.late - b.late).map((emp, i) => (
            <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xl font-black italic shadow-lg">
                  {emp.name?.[0]}
                </div>
                {emp.late === 0 ? (
                  <div className="bg-green-100 text-green-600 p-2.5 rounded-xl animate-bounce" title="Perfect Punctuality">
                    <Award size={20} />
                  </div>
                ) : (
                  <div className="bg-orange-50 text-orange-600 p-2.5 rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                )}
              </div>

              <h3 className="text-xl font-black uppercase italic leading-none mb-1">{emp.name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Attendance Overview</p>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Tracked Records</span>
                  <span className="font-black">{emp.total} Days</span>
                </div>
                <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className={`h-full transition-all duration-1000 ${emp.late > 2 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]'}`} 
                    style={{ width: `${((emp.total - emp.late) / emp.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Late Instances</span>
                  <span className={`font-black italic ${emp.late > 0 ? 'text-red-500' : 'text-green-500'}`}>{emp.late} Days</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
             <BarChart3 size={40} className="mx-auto text-gray-200 mb-4" />
             <p className="font-black text-gray-300 uppercase italic tracking-widest">No staff attendance data found yet.</p>
          </div>
        )}
      </div>

      {/* Insights Banner */}
      <div className="bg-gray-900 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
        <div className="z-10 bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/10">
          <BarChart3 size={40} className="text-blue-400" />
        </div>
        <div className="z-10 text-center md:text-left">
          <h4 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-2">Manager's Insight</h4>
          <p className="text-gray-400 text-sm max-w-xl italic">
            Focus on employees with high 'Late Instances'. Consistency here directly reflects on the office's {userData?.officeName || "Workspace"} operational flow.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
      </div>

    </div>
  );
}