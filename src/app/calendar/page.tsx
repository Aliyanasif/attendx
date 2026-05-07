"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Calendar as CalendarIcon, 
  X, 
  Clock, 
  Info,
  CheckCircle2,
  Banknote // 👈 Naya icon add kiya
} from "lucide-react";

export default function CalendarPage() {
  const { user, userData } = useAuth(); // 👈 userData bhi nikala hai salary ke liye
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "attendance"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const attendanceData = snap.docs.map(doc => {
        const data = doc.data();
        const clockInDate = data.clockIn?.toDate();
        
        return {
          id: doc.id,
          title: `IN: ${clockInDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          start: data.date,
          extendedProps: {
            fullData: data,
            clockIn: clockInDate,
            clockOut: data.clockOut?.toDate() || null
          },
          backgroundColor: "#2563eb",
          borderColor: "#2563eb"
        };
      });
      setEvents(attendanceData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setIsModalOpen(true);
  };

  // 💰 Live Salary Calculation Logic
  const calculateEarning = () => {
    if (!selectedEvent?.clockOut) return "Shift In Progress...";
    
    // Default to 0 if salary is not set in DB
    const baseSalary = parseFloat(userData?.salary || "0"); 
    if (baseSalary === 0) return "Base Salary Not Set";

    // Difference in milliseconds
    const diffMs = selectedEvent.clockOut.getTime() - selectedEvent.clockIn.getTime();
    const diffMins = Math.max(0, diffMs / (1000 * 60)); // Convert to minutes

    // Formula: Salary / 30 Days / 9 Hours / 60 Minutes
    const perMinRate = baseSalary / 30 / 9 / 60;
    
    const earned = diffMins * perMinRate;

    // Formatting out as Rs
    return `Rs ${earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-24 px-4">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase leading-none">
            Work <span className="text-blue-600">Calendar</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2">Track your monthly punch-in/out history.</p>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Calendar Card */}
      <div className="bg-white p-4 md:p-8 rounded-[40px] border border-gray-50 shadow-xl overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          .fc { --fc-border-color: #f3f4f6; font-family: inherit; }
          .fc .fc-toolbar-title { font-weight: 900; text-transform: uppercase; font-style: italic; font-size: 1.1rem !important; }
          .fc .fc-button-primary { background-color: #f9fafb !important; border: 1px solid #f3f4f6 !important; color: #111827 !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 0.65rem !important; border-radius: 12px !important; }
          .fc .fc-button-primary:hover { background-color: #2563eb !important; color: white !important; }
          .fc .fc-daygrid-day-number { font-weight: 800; color: #d1d5db; font-size: 0.8rem; padding: 10px !important; }
          .fc .fc-col-header-cell-cushion { font-weight: 800; text-transform: uppercase; color: #9ca3af; font-size: 0.65rem; padding: 15px 0 !important; }
          .fc-event { border-radius: 8px !important; padding: 3px 6px !important; font-weight: 800 !important; font-size: 0.6rem !important; cursor: pointer; border: none !important; }
        `}} />
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }}
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>

      {/* Pop-up Modal */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">Shift Logs</h3>
              <p className="text-blue-100 font-bold text-sm">{selectedEvent.fullData.date}</p>
            </div>
            
            <div className="p-8 space-y-4">
              
              {/* Punch In */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 shrink-0"><Clock size={24}/></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Punch In</p>
                  <p className="font-black text-gray-900 text-lg leading-none">{selectedEvent.clockIn?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              {/* Punch Out */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 shrink-0"><Clock size={24}/></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Punch Out</p>
                  <p className="font-black text-gray-900 text-lg leading-none">
                    {selectedEvent.clockOut ? selectedEvent.clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "In Progress"}
                  </p>
                </div>
              </div>

              {/* Today's Earning Box */}
              <div className="flex items-center gap-4 bg-green-50 p-4 rounded-3xl border border-green-100">
                <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 shrink-0"><Banknote size={24}/></div>
                <div>
                  <p className="text-[10px] font-black text-green-600/70 uppercase tracking-widest leading-none mb-1">Today's Earning</p>
                  <p className="font-black text-green-700 text-xl leading-none italic tracking-tighter">
                    {calculateEarning()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-2 pt-2">
                <CheckCircle2 className="text-green-500" size={20}/>
                <p className="text-xs font-bold text-gray-500">Verified Attendance & Earnings</p>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="w-full mt-4 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-600 transition-all shadow-xl">Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}