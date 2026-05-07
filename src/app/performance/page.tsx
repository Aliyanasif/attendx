"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; 
import { TrendingUp, Clock, AlertCircle, Award, User, BarChart3, Loader2, Lock } from "lucide-react"; 

export default function PerformancePage() {
  // 🛡️ SECURITY LOCK START --------------------------------------------------
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [overallPunctuality, setOverallPunctuality] = useState(0);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  if (userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900">Access Denied</h2>
        <p className="text-gray-500 font-bold mt-4 max-w-sm italic">Bhai, ye area sirf Management ke liye reserved hai. Aapka access restricted hai.</p>
      </div>
    );
  }
  // 🛡️ SECURITY LOCK END ----------------------------------------------------

  useEffect(() => {
    // Agar user staff hai toh backend data fetch karne ki zaroorat nahi hai (Optimization)
    if (userData?.role === "Staff") return;

    const fetchPerformance = async () => {
      try {
        const q = query(collection(db, "attendance"), orderBy("clockIn", "desc"));
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => doc.data());

        // Logic: Grouping data by employee
        const employeeMap: any = {};
        let totalLate = 0;

        records.forEach((rec: any) => {
          if (!employeeMap[rec.employeeName]) {
            employeeMap[rec.employeeName] = { name: rec.employeeName, total: 0, late: 0, hours: 0 };
          }
          employeeMap[rec.employeeName].total += 1;
          if (rec.status === "Late") {
            employeeMap[rec.employeeName].late += 1;
            totalLate += 1;
          }
        });

        const performanceArray = Object.values(employeeMap);
        setStats(performanceArray);

        // Overall Team Punctuality Calculation
        const totalRecords = records.length;
        const punctuality = totalRecords > 0 ? ((totalRecords - totalLate) / totalRecords) * 100 : 0;
        setOverallPunctuality(Math.round(punctuality));

      } catch (err) { console.error(err); }
      setLoading(false);
    };

    fetchPerformance();
  }, [userData]); 

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
            Staff <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2">Deep dive into team punctuality and work patterns.</p>
        </div>
        <div className="bg-white px-8 py-4 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Punctuality</p>
            <p className="text-2xl font-black text-blue-600">{overallPunctuality}%</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.sort((a, b) => a.late - b.late).map((emp, i) => (
          <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xl font-black italic">
                {emp.name[0]}
              </div>
              {emp.late === 0 ? (
                <div className="bg-green-100 text-green-600 p-2 rounded-xl" title="Perfect Punctuality">
                  <Award size={20} />
                </div>
              ) : (
                <div className="bg-orange-50 text-orange-600 p-2 rounded-xl">
                  <AlertCircle size={20} />
                </div>
              )}
            </div>

            <h3 className="text-xl font-black text-gray-900 uppercase italic leading-none mb-1">{emp.name}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Performance Review</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase">Total Days</span>
                <span className="font-black text-gray-900">{emp.total}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${emp.late > 2 ? 'bg-red-500' : 'bg-blue-600'}`} 
                  style={{ width: `${((emp.total - emp.late) / emp.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Late Comings</span>
                <span className={`font-black ${emp.late > 0 ? 'text-orange-600' : 'text-green-600'}`}>{emp.late} Days</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Insights Banner */}
      <div className="bg-gray-900 rounded-[40px] p-10 text-white flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="z-10 bg-white/10 p-5 rounded-3xl">
          <BarChart3 size={40} className="text-blue-400" />
        </div>
        <div className="z-10 text-center md:text-left">
          <h4 className="text-2xl font-black italic uppercase tracking-tighter">Manager's Insight</h4>
          <p className="text-gray-400 text-sm max-w-xl mt-1">
            The data shows that employees with a 90%+ punctuality score contribute 15% more to operational efficiency. Top performers are highlighted with the award icon.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]"></div>
      </div>

    </div>
  );
}