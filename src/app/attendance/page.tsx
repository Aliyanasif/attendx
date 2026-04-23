"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  Timestamp, 
  limit 
} from "firebase/firestore";
import { Clock, Play, Square, CheckCircle2, Loader2 } from "lucide-react";

export default function AttendancePage() {
  const [recordId, setRecordId] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Aaj ki date (YYYY-MM-DD format)
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Check karein ke kya aaj ka koi record pehle se majood hai
    const q = query(
      collection(db, "attendance"),
      where("date", "==", todayDate),
      where("employeeName", "==", "Aliyan Asif"), // Filhaal hardcoded
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const attendanceDoc = snapshot.docs[0];
        const data = attendanceDoc.data();
        
        setRecordId(attendanceDoc.id);
        // Agar clockOut null hai, iska matlab hai banda abhi bhi clocked in hai
        setIsClockedIn(!data.clockOut);
      } else {
        setIsClockedIn(false);
        setRecordId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [todayDate]);

  const handleClockAction = async () => {
    setActionLoading(true);
    try {
      if (!isClockedIn) {
        // --- CLOCK IN LOGIC ---
        await addDoc(collection(db, "attendance"), {
          employeeName: "Aliyan Asif", // Real app mein ye auth se aayega
          date: todayDate,
          clockIn: Timestamp.now(),
          clockOut: null,
          status: "Present",
        });
      } else if (recordId) {
        // --- CLOCK OUT LOGIC ---
        const docRef = doc(db, "attendance", recordId);
        await updateDoc(docRef, {
          clockOut: Timestamp.now(),
        });
        alert("Shift ended! Well done today. ✅");
      }
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Something went wrong!");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 text-center animate-in zoom-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Shift Control</h1>
        <p className="text-gray-500 text-lg font-medium">Aliyan, mark your attendance for today.</p>
      </div>

      <div className="bg-white p-12 rounded-[48px] shadow-2xl shadow-blue-100 border border-gray-50 inline-block w-full max-w-md relative overflow-hidden group">
        <div className="relative z-10">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 transition-all duration-500 ${isClockedIn ? "bg-green-50 rotate-12 shadow-inner" : "bg-blue-50"}`}>
            {isClockedIn ? (
              <CheckCircle2 className="text-green-600" size={48} />
            ) : (
              <Clock className="text-blue-600" size={48} />
            )}
          </div>
          
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">Session Status</p>
          <h2 className={`text-3xl font-black mt-2 transition-colors ${isClockedIn ? "text-green-600" : "text-gray-900"}`}>
            {isClockedIn ? "WORKING" : "NOT STARTED"}
          </h2>

          <div className="mt-12">
            <button 
              onClick={handleClockAction}
              disabled={actionLoading}
              className={`w-full py-6 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 disabled:opacity-50 ${
                isClockedIn 
                ? "bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              }`}
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : isClockedIn ? (
                <>
                  <Square fill="currentColor" size={24} />
                  <span>Clock Out</span>
                </>
              ) : (
                <>
                  <Play fill="currentColor" size={24} />
                  <span>Clock In Now</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {isClockedIn && (
          <div className="absolute inset-0 bg-green-500/5 animate-pulse pointer-events-none"></div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-md mx-auto">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Office Time</p>
          <p className="text-xl font-bold text-gray-800">09:00 AM - 06:00 PM</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Current Date</p>
          <p className="text-xl font-bold text-blue-600">{todayDate}</p>
        </div>
      </div>
    </div>
  );
}