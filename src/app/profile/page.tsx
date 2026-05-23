"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  User,
  Mail,
  Briefcase,
  Clock,
  Calendar,
  Banknote,
  Loader2,
  Building2,
  Timer,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function ProfilePage() {
  const { userData, user, loading: authLoading } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const displayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid && !userData?.uid && !userData?.email && !userData?.name) {
      setLoading(false);
      return;
    }

    const adminUid = userData?.adminUid || userData?.uid || user?.uid || "";

    if (!adminUid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "attendance"),
      where("adminUid", "==", adminUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setAttendanceRecords(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Profile attendance fetch error:", error);
        setAttendanceRecords([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, user?.uid, userData]);

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

  const monthlyStats = useMemo(() => {
    const baseSalary = Number(userData?.salary || userData?.baseSalary || 0);
    const dutyHours = Number(userData?.dutyHours || 9);
    const perMinuteRate = baseSalary / 30 / dutyHours / 60;

    let overtimeMinutes = 0;
    let overtimePay = 0;
    let lateMinutes = 0;
    let lateDeduction = 0;

    const now = new Date();

    attendanceRecords.forEach((record) => {
      const matched =
        record.employeeId === userData?.id ||
        record.employeeUid === userData?.uid ||
        record.uid === userData?.uid ||
        record.email === userData?.email ||
        record.employeeName === userData?.name;

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

      const shiftStart = buildShiftDate(
        record.date,
        userData?.shiftStart || "09:00"
      );

      const shiftEnd = buildShiftDate(
        record.date,
        userData?.shiftEnd || "18:00"
      );

      if (outTime < inTime) {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
      }

      if (inTime > shiftStart) {
        const mins = (inTime.getTime() - shiftStart.getTime()) / 60000;
        lateMinutes += mins;
        lateDeduction += mins * perMinuteRate;
      }

      if (outTime > shiftEnd) {
        const mins = (outTime.getTime() - shiftEnd.getTime()) / 60000;
        overtimeMinutes += mins;
        overtimePay += mins * perMinuteRate;
      }
    });

    return {
      overtimeMinutes: Math.round(overtimeMinutes),
      overtimeHours: overtimeMinutes / 60,
      overtimePay: Math.round(overtimePay),
      lateMinutes: Math.round(lateMinutes),
      lateDeduction: Math.round(lateDeduction),
    };
  }, [attendanceRecords, userData]);

  const infoCards = [
    {
      icon: Briefcase,
      label: "Designation",
      value: userData?.designation || "Staff Member",
      color: "text-blue-600 bg-blue-50",
    },
    {
      icon: Clock,
      label: "Shift Timing",
      value: `${userData?.shiftStart || "--:--"} - ${
        userData?.shiftEnd || "--:--"
      }`,
      color: "text-orange-600 bg-orange-50",
    },
    {
      icon: Calendar,
      label: "Duty Hours",
      value: `${userData?.dutyHours || "9"} Hours/Day`,
      color: "text-purple-600 bg-purple-50",
    },
    {
      icon: Banknote,
      label: "Basic Salary",
      value: `Rs. ${Number(userData?.salary || 0).toLocaleString()}`,
      color: "text-green-600 bg-green-50",
    },
  ];

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 mt-4 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
            My <span className="text-blue-600">Profile</span>
          </h1>

          <p className="text-gray-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] ml-1 mt-2 flex items-center gap-2">
            <User size={16} className="text-blue-600" /> Employee Portal
          </p>
        </div>

        <div className="bg-white px-6 py-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3">
          <Calendar className="text-blue-600" size={24} />
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

      <div className="bg-white rounded-[48px] p-8 md:p-12 border border-gray-50 shadow-2xl shadow-blue-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-blue-200 shrink-0">
            {userData?.name ? userData.name[0] : "U"}
          </div>

          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black text-gray-900 italic tracking-tight">
                {userData?.name}
              </h1>

              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                {userData?.role || "Staff"}
              </span>
            </div>

            <p className="text-gray-400 font-bold flex items-center justify-center md:justify-start gap-2">
              <Mail size={16} /> {userData?.email}
            </p>

            <p className="text-gray-400 font-bold flex items-center justify-center md:justify-start gap-2">
              <Building2 size={16} />{" "}
              {userData?.officeName || "Organization Name"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {infoCards.map((card, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all"
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${card.color}`}
            >
              <card.icon size={28} />
            </div>

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                {card.label}
              </p>
              <p className="text-xl font-black text-gray-900 italic tracking-tight">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[44px] p-8 border border-gray-50 shadow-xl shadow-blue-50">
        <div className="mb-8">
          <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">
            Current Month
          </p>
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
            Overtime & Late Summary
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PerformanceCard
            icon={<TrendingUp size={28} />}
            label="My Overtime"
            value={`Rs. ${monthlyStats.overtimePay.toLocaleString()}`}
            sub={`${monthlyStats.overtimeHours.toFixed(2)} overtime hours`}
            color="text-green-600 bg-green-50"
          />

          <PerformanceCard
            icon={<AlertTriangle size={28} />}
            label="My Late Deduction"
            value={`Rs. ${monthlyStats.lateDeduction.toLocaleString()}`}
            sub={`${monthlyStats.lateMinutes} late minutes`}
            color="text-red-600 bg-red-50"
          />

          <PerformanceCard
            icon={<Timer size={28} />}
            label="Overtime Minutes"
            value={`${monthlyStats.overtimeMinutes} mins`}
            sub="Calculated after shift end"
            color="text-blue-600 bg-blue-50"
          />

          <PerformanceCard
            icon={<Clock size={28} />}
            label="Late Minutes"
            value={`${monthlyStats.lateMinutes} mins`}
            sub="Calculated after shift start"
            color="text-orange-600 bg-orange-50"
          />
        </div>
      </div>
    </div>
  );
}

function PerformanceCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 flex items-center gap-6 hover:bg-white hover:shadow-lg transition-all">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
          {label}
        </p>
        <p className="text-2xl font-black text-gray-900 italic tracking-tight">
          {value}
        </p>
        <p className="text-xs text-gray-400 font-bold italic mt-1">{sub}</p>
      </div>
    </div>
  );
}