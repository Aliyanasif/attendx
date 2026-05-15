"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Clock,
  CheckCircle2,
  Loader2,
  Fingerprint,
  MapPinned,
  AlertCircle,
} from "lucide-react";
import { notify } from "@/lib/notify";
import dayjs from "dayjs";

type PunchStatus = "not_clocked_in" | "clocked_in" | "completed";

type LocationData = {
  lat: number;
  lng: number;
  accuracy: number;
};

export default function AttendancePage() {
  const { user, userData, loading: authLoading } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);

  const [status, setStatus] = useState<PunchStatus>("not_clocked_in");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  const todayDate = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTodayStatus = async () => {
      if (authLoading) return;

      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const attRef = doc(db, "attendance", `${user.uid}_${todayDate}`);
        const attSnap = await getDoc(attRef);

        if (!attSnap.exists()) {
          setStatus("not_clocked_in");
          setClockInTime(null);
          setClockOutTime(null);
          return;
        }

        const data = attSnap.data();

        if (data.clockIn?.toDate) {
          setClockInTime(dayjs(data.clockIn.toDate()).format("hh:mm A"));
          setStatus("clocked_in");
        }

        if (data.clockOut?.toDate) {
          setClockOutTime(dayjs(data.clockOut.toDate()).format("hh:mm A"));
          setStatus("completed");
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        notify("Unable to load today attendance.");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayStatus();
  }, [authLoading, user?.uid, todayDate]);

  const getLocation = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject("Geolocation is not supported by this browser.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          reject("Location access denied. Please enable GPS.");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handlePunch = async () => {
    if (isPunching) return;

    if (!user?.uid) {
      notify("Please login again.");
      return;
    }

    if (!userData) {
      notify("Profile data missing. Please refresh and try again.");
      return;
    }

    if (!userData.adminUid) {
      notify("Admin mapping missing. Please contact your manager.");
      return;
    }

    setIsPunching(true);

    try {
      notify("Verifying your live location... 📍");

      const userLocation = await getLocation();
      const attRef = doc(db, "attendance", `${user.uid}_${todayDate}`);
      const attSnap = await getDoc(attRef);
      const now = new Date();

      if (status === "not_clocked_in") {
        if (attSnap.exists() && attSnap.data()?.clockIn) {
          notify("You are already clocked in.");
          setStatus("clocked_in");

          const existingClockIn = attSnap.data()?.clockIn;
          if (existingClockIn?.toDate) {
            setClockInTime(dayjs(existingClockIn.toDate()).format("hh:mm A"));
          }

          return;
        }

        await setDoc(
          attRef,
          {
            uid: user.uid,
            employeeUid: user.uid,
            employeeName: userData.name || user.displayName || "Anonymous",
            employeeEmail: userData.email || user.email || "",
            adminUid: userData.adminUid,
            officeName: userData.officeName || "",
            date: todayDate,
            clockIn: now,
            clockInServerTime: serverTimestamp(),
            clockInLocation: userLocation,
            clockOut: null,
            clockOutLocation: null,
            status: "Present",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        setClockInTime(dayjs(now).format("hh:mm A"));
        setStatus("clocked_in");
        notify("Clocked In Successfully! 🟢");
        return;
      }

      if (status === "clocked_in") {
        if (!attSnap.exists() || !attSnap.data()?.clockIn) {
          notify("Clock-in record missing. Please contact admin.");
          setStatus("not_clocked_in");
          return;
        }

        if (attSnap.data()?.clockOut) {
          notify("You already completed today’s shift.");
          setStatus("completed");

          const existingClockOut = attSnap.data()?.clockOut;
          if (existingClockOut?.toDate) {
            setClockOutTime(dayjs(existingClockOut.toDate()).format("hh:mm A"));
          }

          return;
        }

        await updateDoc(attRef, {
          clockOut: now,
          clockOutServerTime: serverTimestamp(),
          clockOutLocation: userLocation,
          status: "Completed",
          updatedAt: serverTimestamp(),
        });

        setClockOutTime(dayjs(now).format("hh:mm A"));
        setStatus("completed");
        notify("Clocked Out Successfully! 🔴");
      }
    } catch (error: any) {
      console.error("Punch Error:", error);
      notify(
        typeof error === "string"
          ? error
          : "Failed to punch in/out. Please try again."
      );
    } finally {
      setIsPunching(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
          Loading Live Punch
        </p>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-gray-900">
        <div className="bg-white rounded-[36px] border border-gray-100 p-10 text-center shadow-sm max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={42} />
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">
            Session Expired
          </h1>
          <p className="text-gray-500 text-sm italic mt-3">
            Please login again to mark your attendance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 mt-4 pb-20 px-4 text-gray-900">
      <div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">
          Live <span className="text-blue-600">Punch</span>
        </h1>

        <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] ml-1 mt-2 flex items-center gap-2">
          <MapPinned size={12} className="text-blue-500" /> GPS Tracking Enabled
        </p>
      </div>

      <div className="bg-white rounded-[42px] md:rounded-[50px] p-6 md:p-12 shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 opacity-60" />

        <div className="relative z-10 space-y-8 w-full max-w-sm">
          <div className="space-y-2">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
              {dayjs(currentTime).format("dddd, MMMM D, YYYY")}
            </p>

            <h2 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tighter italic font-mono">
              {dayjs(currentTime).format("HH:mm")}
              <span className="text-2xl text-gray-400 ml-2">
                {dayjs(currentTime).format("ss")}
              </span>
            </h2>
          </div>

          {status === "completed" ? (
            <div className="bg-gray-50 border border-gray-100 rounded-[35px] p-8 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <CheckCircle2 size={32} />
              </div>

              <p className="font-black text-gray-900 uppercase italic tracking-wide text-lg leading-none">
                Shift Completed
              </p>

              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Logged for {userData?.name || "Employee"}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePunch}
              disabled={isPunching}
              className={`w-full py-8 rounded-[40px] shadow-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 active:scale-95 group ${
                status === "not_clocked_in"
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                  : "bg-red-500 hover:bg-red-600 shadow-red-200"
              } ${isPunching ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {isPunching ? (
                <Loader2 size={48} className="text-white/90 animate-spin" />
              ) : (
                <Fingerprint
                  size={48}
                  className="text-white/90 group-hover:scale-110 transition-transform duration-300"
                />
              )}

              <span className="text-white font-black uppercase tracking-[0.2em] text-xl italic leading-none">
                {isPunching
                  ? "Verifying..."
                  : status === "not_clocked_in"
                    ? "Clock In Now"
                    : "Clock Out"}
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
            <div className="bg-gray-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <Clock size={10} /> In Time
              </p>

              <p
                className={`font-black italic ${
                  clockInTime ? "text-gray-900" : "text-gray-300"
                }`}
              >
                {clockInTime || "--:--"}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <Clock size={10} /> Out Time
              </p>

              <p
                className={`font-black italic ${
                  clockOutTime ? "text-gray-900" : "text-gray-300"
                }`}
              >
                {clockOutTime || "--:--"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}