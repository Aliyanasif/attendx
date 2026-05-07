"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; 
import { 
  Search, Loader2, AlertCircle, Banknote, Users, 
  CheckCircle2, Lock, Clock, CalendarDays, Activity 
} from "lucide-react"; 
import { notify } from "@/lib/notify";

export default function PayrollPage() {
  const { userData, loading: authLoading } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();

  const isDisburseEnabled = currentDay >= 30; // 30 tareekh ya uske baad hi payment allow hogi

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // 🛡️ SECURITY GUARD: Staff ko block karo
  if (userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>
        <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">Access Denied</h2>
        <p className="text-gray-500 font-bold mt-4 max-w-sm italic text-sm">Bhai, ye area sirf Management ke liye reserved hai. Aapka access restricted hai.</p>
      </div>
    );
  }

  // 📥 Fetch Data
  useEffect(() => {
    if (userData?.role === "Staff") return;

    const fetchData = async () => {
      try {
        const [empSnap, attSnap] = await Promise.all([
          getDocs(collection(db, "employees")),
          getDocs(collection(db, "attendance"))
        ]);
        
        setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAttendanceData(attSnap.docs.map(doc => doc.data()));
      } catch (err) { console.error("Fetch Error:", err); }
      setLoading(false);
    };
    fetchData();
  }, [userData]); 

  // ⏱️ CORE LOGIC: Per Minute Salary Calculation
  const getPayrollDetails = (emp: any) => {
    const baseSalary = parseFloat(emp.salary) || 0;
    
    // Filter this employee's attendance
    const empAttendance = attendanceData.filter(a => a.employeeName === emp.name);
    
    let totalMinutes = 0;
    let validDays = 0;

    empAttendance.forEach(record => {
      // Check if it's the current month & year
      const recordDate = new Date(record.date);
      if (recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear()) {
        
        // Ensure both Clock In and Clock Out exist
        if (record.clockIn && record.clockOut) {
          const inTime = record.clockIn.toDate();
          const outTime = record.clockOut.toDate();
          
          const diffMs = outTime.getTime() - inTime.getTime();
          const mins = Math.max(0, diffMs / (1000 * 60));
          
          totalMinutes += mins;
          validDays++;
        }
      }
    });

    // Formatting Time
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);

    // EXACT SALARY FORMULA
    const perMinRate = baseSalary / 30 / 9 / 60;
    const netPay = Math.round(totalMinutes * perMinRate);

    return { 
      totalPresent: validDays, 
      formattedTime: `${hours}h ${mins}m`,
      netPay: netPay < 0 ? 0 : netPay 
    };
  };

  // 💸 Disbursement Handler
  const handleDisburse = async (emp: any, netPay: number, totalPresent: number, trackedTime: string) => {
    if (!isDisburseEnabled) {
      notify("Disbursement is only allowed on or after the 30th.");
      return;
    }

    if (netPay === 0) {
      notify("Cannot disburse Rs 0. No valid attendance found.");
      return;
    }

    const confirmPay = confirm(`Confirm Rs ${netPay.toLocaleString()} payout for ${emp.name}?`);
    
    if (confirmPay) {
      try {
        await addDoc(collection(db, "salary_history"), {
          employeeId: emp.id,
          employeeName: emp.name,
          baseSalary: parseFloat(emp.salary) || 0,
          totalAttendance: totalPresent,
          trackedTime: trackedTime, // Save exact time worked
          netSalary: netPay,
          month: currentMonth,
          year: currentYear,
          disbursedAt: Timestamp.now(),
          status: "Paid"
        });
        notify(`Rs ${netPay.toLocaleString()} disbursed successfully! 🚀`);
      } catch (err) { notify("System error while recording payment."); }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-full overflow-hidden pb-20 px-4 mt-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
            Payroll <span className="text-blue-600">Engine</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2 text-sm flex items-center gap-2">
            <Activity size={14} className="text-blue-600 animate-pulse" /> Live Per-Minute Tracking System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic shadow-xl">
            {currentMonth} {currentYear}
          </div>
          {!isDisburseEnabled && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-2xl border border-amber-100 text-[10px] font-black uppercase italic shadow-sm w-full md:w-auto justify-center">
              <Lock size={14} /> Unlocks on 30th
            </div>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[40px] shadow-2xl shadow-blue-900/20 flex items-center justify-between group">
          <div>
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none">Est. Monthly Liability</p>
            <h4 className="text-3xl md:text-5xl font-black italic text-white mt-2 leading-none tracking-tighter">
              Rs {employees.reduce((acc, curr) => acc + (parseFloat(curr.salary) || 0), 0).toLocaleString()}
            </h4>
          </div>
          <div className="bg-white/10 p-5 rounded-3xl text-white backdrop-blur-md group-hover:scale-110 transition-transform">
            <Banknote size={32} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-xl transition-all group">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Active Staff Members</p>
            <h4 className="text-3xl md:text-5xl font-black italic text-gray-900 mt-2 leading-none tracking-tighter">
              {employees.length} <span className="text-xl text-gray-300">Staff</span>
            </h4>
          </div>
          <div className="bg-gray-50 p-5 rounded-3xl text-gray-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
            <Users size={32} />
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-[28px] border border-gray-100 shadow-sm">
        <div className="bg-gray-50 flex items-center gap-3 px-6 py-4 rounded-[20px] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="text-gray-400 shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Search employee by name..." 
            className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-900"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                <th className="p-8">Employee</th>
                <th className="p-8 text-center">Base Salary</th>
                <th className="p-8">Present Days</th>
                <th className="p-8">Tracked Time</th>
                <th className="p-8 text-right">Net Payment</th>
                <th className="p-8 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={32} /></td></tr>
              ) : (
                employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => {
                  const { totalPresent, formattedTime, netPay } = getPayrollDetails(emp);
                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group text-sm">
                      
                      {/* Name Card */}
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 shrink-0 bg-blue-600 text-white rounded-[18px] flex items-center justify-center font-black italic shadow-md text-lg">{emp.name[0]}</div>
                          <div className="flex flex-col">
                            <span className="font-black text-gray-900 uppercase italic leading-none whitespace-nowrap text-base">{emp.name}</span>
                            <span className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-widest">{emp.designation || "Staff"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="p-6 text-center text-gray-400 italic font-black whitespace-nowrap">
                        Rs {emp.salary}
                      </td>

                      {/* Present Days */}
                      <td className="p-6">
                        <div className="flex items-center gap-2 bg-gray-50 w-max px-4 py-2 rounded-xl text-gray-600 italic whitespace-nowrap">
                          <CalendarDays size={16} className="text-gray-400" />
                          <span className="font-black text-xs">{totalPresent} Days</span>
                        </div>
                      </td>

                      {/* Tracked Time (Hours & Mins) */}
                      <td className="p-6">
                        <div className="flex items-center gap-2 bg-blue-50 w-max px-4 py-2 rounded-xl text-blue-700 italic whitespace-nowrap border border-blue-100">
                          <Clock size={16} className="text-blue-500" />
                          <span className="font-black text-xs tracking-wider">{formattedTime}</span>
                        </div>
                      </td>

                      {/* Net Payment (Calculated) */}
                      <td className="p-6 text-right">
                        <div className="flex flex-col items-end">
                          <p className="text-2xl font-black text-green-600 tracking-tighter italic leading-none whitespace-nowrap">
                            Rs {netPay.toLocaleString()}
                          </p>
                          <p className="text-[8px] font-black text-gray-300 uppercase mt-1 tracking-widest italic">Calculated live</p>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="p-6 text-center">
                        <button 
                          disabled={!isDisburseEnabled || netPay === 0}
                          onClick={() => handleDisburse(emp, netPay, totalPresent, formattedTime)}
                          className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap ${
                            (isDisburseEnabled && netPay > 0) ? "bg-gray-900 text-white hover:bg-green-600 hover:shadow-green-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {isDisburseEnabled ? <CheckCircle2 size={16} /> : <Lock size={16} />} 
                          {isDisburseEnabled ? "Disburse" : "Locked"}
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-gray-900 p-8 rounded-[40px] text-white flex flex-col md:flex-row items-start md:items-center gap-6 shadow-2xl mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <AlertCircle className="text-blue-400 shrink-0 relative z-10" size={32} />
        <div className="relative z-10">
          <h5 className="font-black text-white uppercase text-sm italic tracking-widest leading-none">Auto-Sync Per Minute Logic Active</h5>
          <p className="text-gray-400 text-xs font-bold mt-2 leading-relaxed max-w-3xl">
            This system completely tracks employee hours and minutes. Deductions for being late or leaving early are 
            <span className="text-blue-400"> automatically applied</span> in the Net Payment calculation. Manual deductions are no longer required.
          </p>
        </div>
      </div>

    </div>
  );
}