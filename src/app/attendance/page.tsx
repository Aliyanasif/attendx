"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Clock, MapPin, CheckCircle2, Loader2, Fingerprint, MapPinned } from "lucide-react";
import { notify } from "@/lib/notify";
import dayjs from "dayjs";

export default function AttendancePage() {
  const { user, userData, loading: authLoading } = useAuth();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false); // Punch loading state
  const [status, setStatus] = useState<"not_clocked_in" | "clocked_in" | "completed">("not_clocked_in");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  const todayDate = dayjs().format("YYYY-MM-DD");

  // 🕒 Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 📥 Fetch Today's Attendance Status
  useEffect(() => {
    const fetchTodayStatus = async () => {
      if (!user) return;
      try {
        const attRef = doc(db, "attendance", `${user.uid}_${todayDate}`);
        const attSnap = await getDoc(attRef);

        if (attSnap.exists()) {
          const data = attSnap.data();
          if (data.clockIn) {
            setClockInTime(dayjs(data.clockIn.toDate()).format("hh:mm A"));
            setStatus("clocked_in");
          }
          if (data.clockOut) {
            setClockOutTime(dayjs(data.clockOut.toDate()).format("hh:mm A"));
            setStatus("completed");
          }
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayStatus();
  }, [user, todayDate]);

  // 📍 Helper Function to Get GPS Location
  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported by your browser.");
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            reject("Location access denied! Please enable GPS.");
          },
          { enableHighAccuracy: true } // Premium accuracy
        );
      }
    });
  };

  // 👆 Handle Clock In / Out with GPS
  const handlePunch = async () => {
    if (!user) return;
    setIsPunching(true);

    try {
      // 1. Pehle Location Fetch Karein
      notify("Verifying your live location... 📍");
      const userLocation = await getLocation();

      // 2. Firebase Document Reference
      const attRef = doc(db, "attendance", `${user.uid}_${todayDate}`);
      const now = new Date();

      if (status === "not_clocked_in") {
        // Clock In Logic (Time + Location save)
        await setDoc(attRef, {
          uid: user.uid,
          employeeName: userData?.name || "Anonymous",
          date: todayDate,
          clockIn: now,
          clockInLocation: userLocation, // 📍 GPS Saved!
          clockOut: null,
          status: "Present"
        });
        setClockInTime(dayjs(now).format("hh:mm A"));
        setStatus("clocked_in");
        notify("Clocked In Successfully! 🟢");
      } 
      else if (status === "clocked_in") {
        // Clock Out Logic (Time + Location save)
        await updateDoc(attRef, {
          clockOut: now,
          clockOutLocation: userLocation, // 📍 GPS Saved!
        });
        setClockOutTime(dayjs(now).format("hh:mm A"));
        setStatus("completed");
        notify("Clocked Out Successfully! 🔴");
      }
    } catch (error: any) {
      console.error("Punch Error:", error);
      // Agar user ne location block ki hai toh error dikhayein
      notify(typeof error === "string" ? error : "Failed to punch in/out. Try again.");
    } finally {
      setIsPunching(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 mt-4 pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase text-gray-900 tracking-tighter leading-none">
          Live <span className="text-blue-600">Punch</span>
        </h1>
        <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] ml-1 mt-2 flex items-center gap-2">
          <MapPinned size={12} className="text-blue-500" /> GPS Tracking Enabled
        </p>
      </div>

      {/* MAIN CLOCK CARD */}
      <div className="bg-white rounded-[50px] p-8 md:p-12 shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
        
        {/* Decorative Background Circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-60"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 opacity-60"></div>

        <div className="relative z-10 space-y-8 w-full max-w-sm">
          
          {/* DIGITAL CLOCK */}
          <div className="space-y-2">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
              {dayjs(currentTime).format("dddd, MMMM D, YYYY")}
            </p>
            <h2 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tighter italic font-mono">
              {dayjs(currentTime).format("HH:mm")}
              <span className="text-2xl text-gray-400 ml-2 animate-pulse">{dayjs(currentTime).format("ss")}</span>
            </h2>
          </div>

          {/* ACTION BUTTON */}
          {status === "completed" ? (
            <div className="bg-gray-50 border border-gray-100 rounded-[35px] p-8 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-black text-gray-900 uppercase italic tracking-wide text-lg">Shift Completed</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Location & Time Verified</p>
            </div>
          ) : (
            <button
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
                <Fingerprint size={48} className="text-white/90 group-hover:scale-110 transition-transform duration-300" />
              )}
              <span className="text-white font-black uppercase tracking-[0.2em] text-xl italic">
                {isPunching ? "Verifying..." : status === "not_clocked_in" ? "Clock In Now" : "Clock Out"}
              </span>
            </button>
          )}

          {/* TIMINGS SUMMARY */}
          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-gray-100">
            <div className="bg-gray-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <MapPin size={10} /> In Time
              </p>
              <p className={`font-black italic ${clockInTime ? 'text-gray-900' : 'text-gray-300'}`}>
                {clockInTime || "--:--"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                <MapPin size={10} /> Out Time
              </p>
              <p className={`font-black italic ${clockOutTime ? 'text-gray-900' : 'text-gray-300'}`}>
                {clockOutTime || "--:--"}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}