"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; // 🛡️ AuthContext Import
import { 
  History, Banknote, Calendar, User, Loader2, 
  ChevronDown, Check, MinusCircle, Wallet, Search, Lock // 🛡️ Lock Icon Import
} from "lucide-react";

export default function SalaryHistory() {
  // 🛡️ SECURITY LOCK START --------------------------------------------------
  const { userData, loading: authLoading } = useAuth();
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // Agar user Staff hai toh backend se list mat mangwao (Firebase Optimization)
    if (userData?.role === "Staff") return;

    const fetchStaff = async () => {
      const snap = await getDocs(collection(db, "employees"));
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchStaff();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userData]); // userData dependency mein daal di

  const fetchHistory = async (emp: any) => {
    setLoading(true);
    setSelectedEmp(emp);
    setIsDropdownOpen(false);
    try {
      const q = query(
        collection(db, "salary_history"),
        where("employeeName", "==", emp.name),
        orderBy("disbursedAt", "desc")
      );
      const snap = await getDocs(q);
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
            Salary <span className="text-blue-600">Archives</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2 underline decoration-blue-100">Audit disbursed salary records and performance logs.</p>
        </div>
      </div>

      {/* CUSTOM DROPDOWN SEARCH (Professional Selection) */}
      <div className="relative max-w-md" ref={dropdownRef}>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Search Employee Profile</label>
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`bg-white p-5 rounded-[28px] border flex items-center justify-between cursor-pointer transition-all shadow-sm group ${isDropdownOpen ? 'border-blue-600 ring-4 ring-blue-50 bg-white' : 'border-gray-100 hover:border-blue-200'}`}
        >
          <div className="flex items-center gap-4 text-gray-900 font-bold italic uppercase">
            <User size={20} className="text-blue-600" />
            {selectedEmp ? selectedEmp.name : "Select Staff Member..."}
          </div>
          <ChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`} size={18} />
        </div>

        {isDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[35px] shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
              {employees.map((emp) => (
                <div 
                  key={emp.id}
                  onClick={() => fetchHistory(emp)}
                  className={`px-8 py-4 font-black text-sm uppercase italic cursor-pointer transition-colors flex items-center justify-between hover:bg-blue-50 hover:text-blue-600 ${selectedEmp?.id === emp.id ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                >
                  {emp.name}
                  {selectedEmp?.id === emp.id && <Check size={14} strokeWidth={4} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DATA DISPLAY SECTION */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
      ) : selectedEmp && (
        <div className="grid grid-cols-1 gap-6">
          {history.length > 0 ? history.map((record) => (
            <div key={record.id} className="bg-white p-10 rounded-[50px] border border-gray-50 shadow-sm hover:shadow-xl transition-all border-l-8 border-l-blue-600 group">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] italic">{record.month} {record.year}</span>
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Disbursed Amount</p>
                  <h3 className="text-3xl font-black text-gray-900 italic uppercase leading-none tracking-tighter">
  Rs {(record.netSalary || 0).toLocaleString()}
</h3>                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Wallet size={12} className="text-blue-600"/> Base Pay</p>
                    <p className="font-black text-gray-900 text-md italic tracking-tight uppercase leading-none">Rs {record.baseSalary}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><MinusCircle size={12} className="text-red-500"/> Deduction</p>
                    <p className="font-black text-red-600 text-md italic tracking-tight uppercase leading-none">Rs {record.deduction}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} className="text-blue-600"/> Punctuality</p>
                    <p className="font-black text-blue-600 text-md italic tracking-tight uppercase leading-none">{record.totalAttendance} Days</p>
                  </div>
                </div>

              </div>
            </div>
          )) : (
            <div className="p-20 bg-gray-50 rounded-[50px] border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
              <Search size={40} className="text-gray-200" />
              <p className="font-black text-gray-300 uppercase italic tracking-widest">Select an employee above to view their payout history.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}