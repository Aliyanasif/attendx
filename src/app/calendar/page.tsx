"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function CalendarPage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "attendance"), orderBy("clockIn", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setAttendanceData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Calendar</h1>
        <p className="text-gray-500">Track your daily punch-in and punch-out history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {attendanceData.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {item.date}
              </span>
              <span className="text-[10px] font-bold text-green-600 uppercase">Present</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400 font-medium italic">Time In:</span>
                <span className="text-sm font-bold text-gray-800">
                  {item.clockIn?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                <span className="text-xs text-gray-400 font-medium italic">Time Out:</span>
                <span className="text-sm font-bold text-gray-800">
                  {item.clockOut ? item.clockOut.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}