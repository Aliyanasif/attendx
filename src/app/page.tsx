"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Users,
  Banknote,
  UserCheck,
  UserX,
  X,
  Mail,
  Briefcase,
  Loader2,
  ShieldCheck,
  Activity,
  CalendarDays,
  ArrowRight,
  Clock,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

export default function ManagerDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [payrollModalType, setPayrollModalType] = useState<"overtime" | "late" | "net" | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const displayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (authLoading) return;

    if (!userData) {
      router.replace("/login");
      return;
    }

    if (userData?.role === "Staff") {
      router.replace("/profile");
    }
  }, [authLoading, userData, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!userData?.uid || userData?.role === "Staff") {
      setLoading(false);
      return;
    }

    setLoading(true);

    const empQuery = query(
      collection(db, "employees"),
      where("adminUid", "==", userData.uid)
    );

    const attQuery = query(
      collection(db, "attendance"),
      where("adminUid", "==", userData.uid)
    );

    const unsubEmp = onSnapshot(
      empQuery,
      (snap) => {
        setEmployees(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Employees Snapshot Error:", error);
        setEmployees([]);
        setLoading(false);
      }
    );

    const unsubAtt = onSnapshot(
      attQuery,
      (snap) => {
        const records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllAttendance(records);
        setAttendance(records.filter((att: any) => att.date === today));
        setLoading(false);
      },
      (error) => {
        console.error("Attendance Snapshot Error:", error);
        setAttendance([]);
        setAllAttendance([]);
        setLoading(false);
      }
    );

    return () => {
      unsubEmp();
      unsubAtt();
    };
  }, [authLoading, today, userData?.uid, userData?.role]);

  const toDateSafe = (value: any) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    return new Date(value);
  };

  const buildShiftDate = (dateString: string, timeString: string) => {
    const [hours, minutes] = (timeString || "09:00").split(":").map(Number);
    const date = new Date(dateString);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  const isEmployeePresent = (emp: any) => {
    return attendance.some((att: any) => {
      return (
        att.employeeId === emp.id ||
        att.employeeUid === emp.uid ||
        att.uid === emp.uid ||
        att.email === emp.email ||
        att.employeeName === emp.name
      );
    });
  };

  const presentStaff = useMemo(
    () => employees.filter((emp) => isEmployeePresent(emp)),
    [employees, attendance]
  );

  const absentStaff = useMemo(
    () => employees.filter((emp) => !isEmployeePresent(emp)),
    [employees, attendance]
  );

  const totalSalaries = useMemo(
    () =>
      employees.reduce((acc, curr) => {
        const salary = Number(curr.salary || curr.baseSalary || 0);
        return acc + (Number.isFinite(salary) ? salary : 0);
      }, 0),
    [employees]
  );

  const employeePayrollBreakdown = useMemo(() => {
    const now = new Date();

    return employees.map((emp) => {
      const baseSalary = Number(emp.salary || emp.baseSalary || 0);
      const dutyHours = Number(emp.dutyHours || 9);
      const dailyRate = baseSalary / 30;
      const perMinuteRate = baseSalary / 30 / dutyHours / 60;

      let presentDays = 0;
      let trackedMinutes = 0;
      let overtimeMinutes = 0;
      let overtimePay = 0;
      let lateMinutes = 0;
      let lateDeduction = 0;

      allAttendance.forEach((record) => {
        const matched =
          record.employeeId === emp.id ||
          record.employeeUid === emp.uid ||
          record.uid === emp.uid ||
          record.email === emp.email ||
          record.employeeName === emp.name;

        if (!matched || !record.date) return;

        const recordDate = new Date(record.date);

        if (
          recordDate.getMonth() !== now.getMonth() ||
          recordDate.getFullYear() !== now.getFullYear()
        ) {
          return;
        }

        const inTime = toDateSafe(record.clockIn);
        const outTime = toDateSafe(record.clockOut);

        if (!inTime || !outTime) return;

        presentDays++;

        const workedMins =
          typeof record.workedMinutes === "number"
            ? record.workedMinutes
            : Math.max(0, (outTime.getTime() - inTime.getTime()) / 60000);

        trackedMinutes += workedMins;

        let currentLateMins = 0;
        let currentOvertimeMins = 0;

        if (typeof record.lateMinutes === "number") {
          currentLateMins = record.lateMinutes;
        } else {
          const shiftStart = buildShiftDate(record.date, emp.shiftStart || "09:00");
          currentLateMins =
            inTime > shiftStart
              ? Math.max(0, (inTime.getTime() - shiftStart.getTime()) / 60000)
              : 0;
        }

        if (typeof record.overtimeMinutes === "number") {
          currentOvertimeMins = record.overtimeMinutes;
        } else {
          const shiftEnd = buildShiftDate(record.date, emp.shiftEnd || "18:00");

          if (outTime < inTime) {
            shiftEnd.setDate(shiftEnd.getDate() + 1);
          }

          currentOvertimeMins =
            outTime > shiftEnd
              ? Math.max(0, (outTime.getTime() - shiftEnd.getTime()) / 60000)
              : 0;
        }

        lateMinutes += currentLateMins;
        overtimeMinutes += currentOvertimeMins;

        lateDeduction += currentLateMins * perMinuteRate;
        overtimePay += currentOvertimeMins * perMinuteRate;
      });

      const earnedSalary = Math.round(dailyRate * presentDays);
      const roundedOvertimePay = Math.round(overtimePay);
      const roundedLateDeduction = Math.round(lateDeduction);
      const netPayable = Math.max(
        0,
        Math.round(earnedSalary + roundedOvertimePay - roundedLateDeduction)
      );

      return {
        id: emp.id,
        name: emp.name || "Unnamed Staff",
        designation: emp.designation || "Staff",
        monthlySalary: Math.round(baseSalary),
        dailyRate: Math.round(dailyRate),
        hourlyRate: Math.round(perMinuteRate * 60),
        presentDays,
        trackedMinutes: Math.round(trackedMinutes),
        earnedSalary,
        overtimeMinutes: Math.round(overtimeMinutes),
        overtimePay: roundedOvertimePay,
        lateMinutes: Math.round(lateMinutes),
        lateDeduction: roundedLateDeduction,
        netPayable,
      };
    });
  }, [employees, allAttendance]);

  const monthlyPayrollStats = useMemo(() => {
    return employeePayrollBreakdown.reduce(
      (acc, item) => {
        acc.totalEarnedSalary += item.earnedSalary;
        acc.totalOvertimeMinutes += item.overtimeMinutes;
        acc.totalOvertimePay += item.overtimePay;
        acc.totalLateMinutes += item.lateMinutes;
        acc.totalLateDeduction += item.lateDeduction;
        acc.totalNetPayable += item.netPayable;
        return acc;
      },
      {
        totalEarnedSalary: 0,
        totalOvertimeMinutes: 0,
        totalOvertimePay: 0,
        totalLateMinutes: 0,
        totalLateDeduction: 0,
        totalNetPayable: 0,
      }
    );
  }, [employeePayrollBreakdown]);

  const attendanceRate =
    employees.length > 0
      ? Math.round((presentStaff.length / employees.length) * 100)
      : 0;

  if (authLoading || loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-blue-600" size={42} />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Loading Command Center
        </p>
      </div>
    );
  }

  if (userData?.role === "Staff") {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-24 px-4 md:px-6 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
            Attend<span className="text-blue-600">X</span>
          </h1>

          <p className="text-gray-400 font-black text-[10px] md:text-sm uppercase tracking-[0.25em] ml-1 mt-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-600" />
            Next-Gen Workforce Management
          </p>
        </div>

        <div className="bg-white px-6 py-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3">
          <CalendarDays className="text-blue-600" size={24} />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
              Today's Date
            </p>
            <p className="font-bold text-gray-900 text-sm italic">
              {displayDate}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5">
        <StatCard
          icon={<Users size={24} />}
          label="Total Workforce"
          value={employees.length}
          sub="Registered staff"
          className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-blue-900/20"
        />

        <StatCard
          icon={<UserCheck size={24} />}
          label="Active Today"
          value={presentStaff.length}
          sub={`${attendanceRate}% attendance rate`}
          className="bg-white text-gray-900 border border-gray-100"
          iconClass="bg-green-50 text-green-600"
        />

        <StatCard
          icon={<Banknote size={24} />}
          label="Monthly Earned"
          value={`Rs ${monthlyPayrollStats.totalEarnedSalary.toLocaleString()}`}
          sub={`Base liability: Rs ${totalSalaries.toLocaleString()}`}
          className="bg-gray-900 text-white"
        />

        <StatCard
          icon={<Clock size={24} />}
          label="Monthly Overtime"
          value={`Rs ${monthlyPayrollStats.totalOvertimePay.toLocaleString()}`}
          sub={`${(monthlyPayrollStats.totalOvertimeMinutes / 60).toFixed(1)} overtime hours`}
          className="bg-white text-gray-900 border border-gray-100"
          iconClass="bg-green-50 text-green-600"
          onClick={() => setPayrollModalType("overtime")}
        />

        <StatCard
          icon={<AlertTriangle size={24} />}
          label="Late Deduction"
          value={`Rs ${monthlyPayrollStats.totalLateDeduction.toLocaleString()}`}
          sub={`${monthlyPayrollStats.totalLateMinutes} late minutes`}
          className="bg-white text-gray-900 border border-gray-100"
          iconClass="bg-red-50 text-red-600"
          onClick={() => setPayrollModalType("late")}
        />

        <StatCard
          icon={<TrendingUp size={24} />}
          label="Net Payable"
          value={`Rs ${monthlyPayrollStats.totalNetPayable.toLocaleString()}`}
          sub="Earned + overtime - late"
          className="bg-white text-gray-900 border border-gray-100"
          iconClass="bg-blue-50 text-blue-600"
          onClick={() => setPayrollModalType("net")}
        />
      </div>

      {payrollModalType && (
        <PayrollDetailModal
          type={payrollModalType}
          records={employeePayrollBreakdown}
          onClose={() => setPayrollModalType(null)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <StaffList
            title="Present Now"
            subtitle="Live active staff"
            count={presentStaff.length}
            color="green"
            employees={presentStaff}
            emptyText="No staff clocked in yet."
            onOpen={(emp) => {
              setSelectedStaff(emp);
              setIsProfileOpen(true);
            }}
          />

          <StaffList
            title="Missing / Absent"
            subtitle="Not reported today"
            count={absentStaff.length}
            color="red"
            employees={absentStaff}
            emptyText="Everyone is present! 🎉"
            onOpen={(emp) => {
              setSelectedStaff(emp);
              setIsProfileOpen(true);
            }}
          />
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-[36px] border border-gray-100 shadow-sm p-7">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5">
              <Sparkles size={22} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">
              Manager Insight
            </p>

            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-3">
              Today's Workforce Pulse
            </h3>

            <p className="text-gray-500 italic text-sm leading-relaxed">
              {employees.length === 0
                ? "Add employees to start tracking attendance and payroll insights."
                : attendanceRate >= 80
                ? "Attendance health looks strong today. Keep monitoring late arrivals and missed punches."
                : "Attendance rate is low today. Review missing staff and follow up where needed."}
            </p>
          </div>

          <div className="bg-gray-900 rounded-[36px] p-7 text-white overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/30 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 text-blue-300 rounded-2xl flex items-center justify-center mb-5">
                <Clock size={22} />
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-2">
                Quick Status
              </p>

              <h3 className="text-4xl font-black italic tracking-tighter mb-2">
                {attendanceRate}%
              </h3>

              <p className="text-gray-400 text-sm italic">
                Attendance coverage for today.
              </p>
            </div>
          </div>

          {employees.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-[28px] p-6 flex gap-4">
              <AlertTriangle className="text-amber-600 shrink-0" size={22} />
              <div>
                <h4 className="font-black italic uppercase text-gray-900 text-sm">
                  No Employees Found
                </h4>
                <p className="text-gray-500 text-xs italic mt-1 leading-relaxed">
                  Your dashboard is connected, but no staff records are linked
                  to this admin account yet.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isProfileOpen && selectedStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden relative animate-in zoom-in duration-300 border border-white/20">
            <div className="bg-gray-900 h-32 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "16px 16px",
                }}
              />

              <button
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-6 right-6 text-white hover:bg-white/20 p-2 rounded-full transition-all z-10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-8 -mt-16 relative flex flex-col items-center">
              <div className="w-28 h-28 bg-white rounded-[32px] p-2 shadow-xl mb-4">
                <div className="w-full h-full bg-blue-600 rounded-[24px] flex items-center justify-center text-white text-4xl font-black italic">
                  {(selectedStaff.name || "A")[0]}
                </div>
              </div>

              <h2 className="text-2xl font-black text-gray-900 uppercase italic leading-none text-center">
                {selectedStaff.name || "Unnamed Staff"}
              </h2>

              <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest mt-3 border border-blue-100">
                {selectedStaff.designation || "Staff"}
              </span>

              <div className="w-full mt-8 space-y-3">
                <InfoRow
                  icon={<Mail size={16} />}
                  label="Email"
                  value={selectedStaff.email || "Not provided"}
                />

                <InfoRow
                  icon={<Briefcase size={16} />}
                  label="Role"
                  value={selectedStaff.role || "Staff"}
                />

                <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Banknote size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Base Salary
                    </span>
                  </div>

                  <span className="font-black text-blue-700 text-sm italic tracking-tighter">
                    Rs{" "}
                    {Number(
                      selectedStaff.salary || selectedStaff.baseSalary || 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsProfileOpen(false)}
                className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl"
              >
                Close ID Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  className,
  iconClass,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  className: string;
  iconClass?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} p-7 rounded-[36px] shadow-sm flex flex-col justify-between min-h-[190px] hover:scale-[1.01] transition-transform text-left ${
        onClick ? "cursor-pointer hover:shadow-xl" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div
          className={`p-3 rounded-2xl ${
            iconClass || "bg-white/15 text-white backdrop-blur-md"
          }`}
        >
          {icon}
        </div>
        <Activity size={18} className="opacity-40" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-2 opacity-60">
          {label}
        </p>

        <h4 className="text-4xl font-black italic tracking-tighter">
          {value}
        </h4>

        <p className="text-xs font-bold italic opacity-50 mt-2">{sub}</p>
      </div>
    </button>
  );
}

function StaffList({
  title,
  subtitle,
  count,
  color,
  employees,
  emptyText,
  onOpen,
}: {
  title: string;
  subtitle: string;
  count: number;
  color: "green" | "red";
  employees: any[];
  emptyText: string;
  onOpen: (emp: any) => void;
}) {
  const styles =
    color === "green"
      ? {
          soft: "bg-green-50/30",
          dot: "bg-green-500",
          badge: "bg-green-100 text-green-700",
          avatar: "bg-green-50 text-green-600 group-hover:bg-green-600",
          role: "text-green-500",
          hover: "hover:border-green-300",
          arrow: "group-hover:text-green-500",
        }
      : {
          soft: "bg-red-50/30",
          dot: "bg-red-500",
          badge: "bg-red-100 text-red-700",
          avatar: "bg-red-50 text-red-600 group-hover:bg-red-600",
          role: "text-red-500",
          hover: "hover:border-red-300",
          arrow: "group-hover:text-red-500",
        };

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[620px]">
      <div
        className={`p-7 border-b border-gray-50 flex justify-between items-center ${styles.soft}`}
      >
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${styles.dot}`} />
            {title}
          </h3>

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            {subtitle}
          </p>
        </div>

        <span
          className={`${styles.badge} px-4 py-2 rounded-2xl text-xs font-black italic`}
        >
          {count}
        </span>
      </div>

      <div className="p-4 space-y-2 overflow-y-auto custom-scrollbar flex-1">
        {employees.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 font-bold italic text-sm text-center px-4">
            {emptyText}
          </div>
        ) : (
          employees.map((emp) => (
            <button
              type="button"
              key={emp.id || emp.uid || emp.email}
              onClick={() => onOpen(emp)}
              className={`w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[24px] ${styles.hover} hover:shadow-md transition-all cursor-pointer group text-left`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-12 h-12 ${styles.avatar} rounded-[18px] flex items-center justify-center font-black italic text-xl group-hover:text-white transition-colors shrink-0`}
                >
                  {(emp.name || "A")[0]}
                </div>

                <div className="min-w-0">
                  <p className="font-black text-gray-900 uppercase italic text-sm leading-none truncate">
                    {emp.name || "Unnamed Staff"}
                  </p>

                  <p
                    className={`text-[10px] font-bold ${styles.role} uppercase mt-1 tracking-widest truncate`}
                  >
                    {emp.designation || "Staff"}
                  </p>
                </div>
              </div>

              <ArrowRight
                size={18}
                className={`text-gray-300 ${styles.arrow} group-hover:translate-x-1 transition-all shrink-0`}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="flex items-center gap-3 text-gray-500 shrink-0">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">
          {label}
        </span>
      </div>

      <span className="font-bold text-gray-900 text-xs truncate max-w-[170px]">
        {value}
      </span>
    </div>
  );
}

function PayrollDetailModal({
  type,
  records,
  onClose,
}: {
  type: "overtime" | "late" | "net";
  records: any[];
  onClose: () => void;
}) {
  const filtered =
    type === "overtime"
      ? records.filter((r) => r.overtimeMinutes > 0)
      : type === "late"
      ? records.filter((r) => r.lateMinutes > 0)
      : records.filter((r) => r.netPayable > 0);

  const title =
    type === "overtime"
      ? "Overtime Breakdown"
      : type === "late"
      ? "Late Deduction Breakdown"
      : "Net Payable Breakdown";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-gray-900 text-white p-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">
              {title}
            </h2>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.25em] mt-2">
              Current month employee-wise payroll record
            </p>
          </div>

          <button onClick={onClose} className="p-3 rounded-full hover:bg-white/10">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                <th className="p-4">Employee</th>
                <th className="p-4">Present</th>
                <th className="p-4 text-right">Earned</th>
                <th className="p-4 text-right">Overtime</th>
                <th className="p-4 text-right">Late</th>
                <th className="p-4 text-right">Net Payable</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 font-bold italic">
                    No records found for this month.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="p-4">
                      <p className="font-black uppercase italic text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                        {item.designation}
                      </p>
                    </td>

                    <td className="p-4 font-black italic">
                      {item.presentDays} days
                    </td>

                    <td className="p-4 text-right font-black italic text-blue-600">
                      Rs {item.earnedSalary.toLocaleString()}
                    </td>

                    <td className="p-4 text-right font-black italic text-green-600">
                      + Rs {item.overtimePay.toLocaleString()}
                      <p className="text-[10px] text-gray-400 uppercase">
                        {(item.overtimeMinutes / 60).toFixed(2)} hrs
                      </p>
                    </td>

                    <td className="p-4 text-right font-black italic text-red-500">
                      - Rs {item.lateDeduction.toLocaleString()}
                      <p className="text-[10px] text-gray-400 uppercase">
                        {item.lateMinutes} mins
                      </p>
                    </td>

                    <td className="p-4 text-right font-black italic text-gray-900">
                      Rs {item.netPayable.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}