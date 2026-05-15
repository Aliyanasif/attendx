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
} from "lucide-react";

export default function ManagerDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        const todayAtt = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((att: any) => att.date === today);

        setAttendance(todayAtt);
        setLoading(false);
      },
      (error) => {
        console.error("Attendance Snapshot Error:", error);
        setAttendance([]);
        setLoading(false);
      }
    );

    return () => {
      unsubEmp();
      unsubAtt();
    };
  }, [authLoading, today, userData?.uid, userData?.role]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          dark
          icon={<Users size={24} />}
          label="Total Workforce"
          value={employees.length}
          sub="Registered staff"
          className="bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-blue-900/20"
        />

        <StatCard
          icon={<Banknote size={24} />}
          label="Est. Liability"
          value={`Rs ${totalSalaries.toLocaleString()}`}
          sub="Monthly base payroll"
          className="bg-gray-900 text-white"
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
          icon={<UserX size={24} />}
          label="Missing / Absent"
          value={absentStaff.length}
          sub="Not reported today"
          className="bg-white text-gray-900 border border-gray-100"
          iconClass="bg-red-50 text-red-600"
        />
      </div>

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
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  className: string;
  iconClass?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`${className} p-7 rounded-[36px] shadow-sm flex flex-col justify-between min-h-[190px] hover:scale-[1.01] transition-transform`}
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
    </div>
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