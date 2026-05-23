"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  User,
  Loader2,
  ChevronDown,
  Check,
  MinusCircle,
  Wallet,
  Search,
  Lock,
  Clock,
  TrendingUp,
  Banknote,
} from "lucide-react";

export default function SalaryHistory() {
  const { userData, user, loading: authLoading } = useAuth();

  const [employees, setEmployees] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading || !user?.uid || userData?.role === "Staff") return;

    const fetchStaff = async () => {
      try {
        const q = query(
          collection(db, "employees"),
          where("adminUid", "==", user.uid)
        );

        const snap = await getDocs(q);
        setEmployees(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Staff fetch error:", err);
      }
    };

    fetchStaff();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user?.uid, userData, authLoading]);

  const fetchHistory = async (emp: any) => {
    if (!user?.uid) return;

    setLoading(true);
    setSelectedEmp(emp);
    setIsDropdownOpen(false);

    try {
      const q = query(
        collection(db, "salary_history"),
        where("employeeName", "==", emp.name),
        where("adminUid", "==", user.uid),
        orderBy("disbursedAt", "desc")
      );

      const snap = await getDocs(q);

      setHistory(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-900">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500 text-gray-900">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>

        <h2 className="text-4xl font-black italic uppercase tracking-tighter">
          Access Denied
        </h2>

        <p className="text-gray-500 font-bold mt-4 max-w-sm italic tracking-tight">
          Bhai, ye area sirf Management ke liye reserved hai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter italic uppercase leading-none">
            Salary <span className="text-blue-600">Archives</span>
          </h1>

          <p className="text-gray-500 font-medium italic mt-2 underline decoration-blue-100">
            Audit disbursed salary records, overtime payments and late
            deductions.
          </p>
        </div>
      </div>

      <div className="relative max-w-md" ref={dropdownRef}>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1 mb-2 block">
          Search Employee Profile
        </label>

        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`bg-white p-5 rounded-[28px] border flex items-center justify-between cursor-pointer transition-all shadow-sm group ${
            isDropdownOpen
              ? "border-blue-600 ring-4 ring-blue-50 bg-white"
              : "border-gray-100 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center gap-4 font-bold italic uppercase">
            <User size={20} className="text-blue-600" />
            {selectedEmp ? selectedEmp.name : "Select Staff Member..."}
          </div>

          <ChevronDown
            className={`transition-transform duration-300 ${
              isDropdownOpen ? "rotate-180 text-blue-600" : "text-gray-400"
            }`}
            size={18}
          />
        </div>

        {isDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[35px] shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
            <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => fetchHistory(emp)}
                    className={`px-8 py-4 font-black text-sm uppercase italic cursor-pointer transition-colors flex items-center justify-between hover:bg-blue-50 hover:text-blue-600 ${
                      selectedEmp?.id === emp.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {emp.name}
                    {selectedEmp?.id === emp.id && (
                      <Check size={14} strokeWidth={4} />
                    )}
                  </div>
                ))
              ) : (
                <div className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase italic">
                  No staff found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : selectedEmp ? (
        <div className="grid grid-cols-1 gap-6">
          {history.length > 0 ? (
            history.map((record) => {
              const basePay = Number(record.baseSalary || 0);
              const netPay = Number(record.netSalary || 0);

              const overtimePay = Number(record.overtimePay || 0);
              const overtimeHours = Number(record.overtimeHours || 0);
              const lateDeduction = Number(record.lateDeduction || 0);
              const lateMinutes = Number(record.lateMinutes || 0);

              const oldDeductionFallback =
                !record.lateDeduction && basePay > netPay
                  ? basePay - netPay
                  : lateDeduction;

              return (
                <div
                  key={record.id}
                  className="bg-white p-8 md:p-10 rounded-[50px] border border-gray-50 shadow-sm hover:shadow-xl transition-all border-l-8 border-l-blue-600 group"
                >
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    <div className="space-y-1 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] italic">
                          {record.month} {record.year}
                        </span>
                      </div>

                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Net Disbursed Amount
                      </p>

                      <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter">
                        PKR {netPay.toLocaleString()}
                      </h3>

                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest pt-2">
                        {record.status || "Paid"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 w-full">
                      <ArchiveMetric
                        icon={<Wallet size={13} />}
                        label="Base Pay"
                        value={`PKR ${basePay.toLocaleString()}`}
                        color="text-gray-900"
                      />

                      <ArchiveMetric
                        icon={<Clock size={13} />}
                        label="Overtime Hours"
                        value={`${overtimeHours.toFixed(2)} hrs`}
                        color="text-green-600"
                      />

                      <ArchiveMetric
                        icon={<TrendingUp size={13} />}
                        label="Overtime Pay"
                        value={`+ PKR ${overtimePay.toLocaleString()}`}
                        color="text-green-600"
                      />

                      <ArchiveMetric
                        icon={<MinusCircle size={13} />}
                        label="Late Deduction"
                        value={`- PKR ${oldDeductionFallback.toLocaleString()}`}
                        color="text-red-600"
                      />

                      <ArchiveMetric
                        icon={<Banknote size={13} />}
                        label="Late Minutes"
                        value={`${lateMinutes} mins`}
                        color="text-red-600"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      Attendance:{" "}
                      <span className="text-blue-600">
                        {record.totalAttendance || 0} Days
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4">
                      Tracked:{" "}
                      <span className="text-blue-600">
                        {record.trackedTime || "0h 0m"}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4">
                      Hourly Rate:{" "}
                      <span className="text-blue-600">
                        PKR {Math.round(Number(record.hourlyRate || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-20 bg-gray-50 rounded-[50px] border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
              <Search size={40} className="text-gray-200" />
              <p className="font-black text-gray-300 uppercase italic tracking-widest">
                No payout history found for this employee.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-20 bg-gray-50 rounded-[50px] border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
          <Search size={40} className="text-gray-200" />
          <p className="font-black text-gray-300 uppercase italic tracking-widest">
            Select an employee above to view their payout history.
          </p>
        </div>
      )}
    </div>
  );
}

function ArchiveMetric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="space-y-1 bg-gray-50 rounded-3xl p-5 border border-gray-100">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
        <span className={color}>{icon}</span> {label}
      </p>

      <p
        className={`font-black text-sm italic tracking-tight uppercase leading-none ${color}`}
      >
        {value}
      </p>
    </div>
  );
}