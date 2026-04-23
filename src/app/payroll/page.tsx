"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { Banknote, Receipt, TrendingUp } from "lucide-react";

export default function PayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get Employees
    const unsubEmp = onSnapshot(collection(db, "employees"), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Get Attendance
    const unsubAtt = onSnapshot(collection(db, "attendance"), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => { unsubEmp(); unsubAtt(); };
  }, []);

  // Salary Calculation Logic
  const calculatePayroll = (empName: string, baseSalaryStr: string) => {
    const baseSalary = parseInt(baseSalaryStr.replace(/\D/g, '')) || 0;
    const dailyRate = baseSalary / 30; // Assuming 30 days month
    
    // Count how many times this employee clocked in
    const presentDays = attendance.filter(a => a.employeeName === empName).length;
    const totalEarnings = Math.round(presentDays * dailyRate);

    return { presentDays, totalEarnings };
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payroll Processing</h1>
          <p className="text-gray-500 font-medium">Automatic salary calculation based on live attendance.</p>
        </div>
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-2xl font-bold flex items-center gap-2 border border-green-100">
          <TrendingUp size={18} />
          <span>Cycle: April 2026</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {employees.map((emp) => {
          const { presentDays, totalEarnings } = calculatePayroll(emp.name, emp.salary);
          
          return (
            <div key={emp.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-xl transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {emp.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{emp.name}</h3>
                  <p className="text-sm text-gray-400 font-medium">{emp.role} • {emp.salary} (Base)</p>
                </div>
              </div>

              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Days Present</p>
                  <p className="text-xl font-bold text-gray-800">{presentDays} / 30</p>
                </div>
                
                <div className="h-10 w-[1px] bg-gray-100"></div>

                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Net Payable</p>
                  <p className="text-2xl font-black text-blue-600">Rs. {totalEarnings.toLocaleString()}</p>
                </div>

                <button className="bg-gray-900 text-white p-3 rounded-2xl hover:bg-blue-600 transition-colors">
                  <Receipt size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-center text-gray-400 font-medium">Calculating payroll data...</p>}
    </div>
  );
}