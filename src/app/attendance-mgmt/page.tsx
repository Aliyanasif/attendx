"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { 
  Search, Loader2, ArrowLeft, Clock, Banknote, 
  CheckCircle2, X, MapPin, ExternalLink, Activity
} from "lucide-react";
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation"; 

// FullCalendar Imports
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";

export default function AttendanceManagement() {
  const { userData, loading: authLoading } = useAuth(); 
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Views State
  const [view, setView] = useState<"staffList" | "calendar">("staffList");
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  
  // Calendar States
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // 🛡️ SECURITY GUARD
  useEffect(() => {
    if (!authLoading && userData?.role === "Staff") {
      router.push("/attendance"); 
    }
  }, [userData, authLoading, router]);

  // 1. Fetch All Employees
  useEffect(() => {
    if (authLoading || userData?.role === "Staff") return; 

    const unsubscribe = onSnapshot(collection(db, "employees"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [authLoading, userData]);

  // 2. Fetch Selected Employee's Attendance
  useEffect(() => {
    if (view !== "calendar" || !selectedEmp) return;

    const q = query(collection(db, "attendance"), where("employeeName", "==", selectedEmp.name));
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
            clockOut: data.clockOut?.toDate() || null,
            // 📍 Locations pass kar rahe hain modal ke liye
            inLocation: data.clockInLocation || null,
            outLocation: data.clockOutLocation || null
          },
          backgroundColor: "#2563eb",
          borderColor: "#2563eb"
        };
      });
      setEvents(attendanceData);
    });

    return () => unsubscribe();
  }, [selectedEmp, view]);

  // Handlers
  const openCalendar = (emp: any) => {
    setSelectedEmp(emp);
    setView("calendar");
  };

  const closeCalendar = () => {
    setView("staffList");
    setSelectedEmp(null);
    setEvents([]);
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setIsModalOpen(true);
  };

  // Google Maps URL Generator
  const getMapLink = (loc: { lat: number, lng: number }) => {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  };

  const calculateEarning = () => {
    if (!selectedEvent?.clockOut) return "Shift In Progress...";
    const baseSalary = parseFloat(selectedEmp?.salary || "0"); 
    if (baseSalary === 0) return "Base Salary Not Set";
    const diffMs = selectedEvent.clockOut.getTime() - selectedEvent.clockIn.getTime();
    const diffMins = Math.max(0, diffMs / (1000 * 60)); 
    const perMinRate = baseSalary / 30 / 9 / 60;
    const earned = diffMins * perMinRate;
    return `Rs ${earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (authLoading || userData?.role === "Staff") {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4">
      
      {view === "staffList" ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
                Staff <span className="text-blue-600">Logs</span>
              </h1>
              <p className="text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">Select employee to verify GPS & Logs</p>
            </div>
            <div className="bg-white flex items-center gap-3 px-6 py-3 rounded-[24px] border border-gray-100 shadow-sm w-full md:w-auto">
              <Search className="text-gray-400" size={18} />
              <input type="text" placeholder="Search staff..." className="bg-transparent border-none outline-none w-full font-bold text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => (
              <div key={emp.id} onClick={() => openCalendar(emp)} className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center font-black italic text-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">{emp.name[0]}</div>
                <h3 className="text-lg font-black text-gray-900 uppercase italic leading-none truncate">{emp.name}</h3>
                <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">{emp.designation || "Staff"}</p>
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-gray-400 group-hover:text-gray-900 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">Open Analytics</span>
                  <ArrowLeft size={16} className="rotate-180" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button onClick={closeCalendar} className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white transition-all"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">{selectedEmp?.name}'s <span className="text-blue-600">Logs</span></h1>
                <p className="text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">Reviewing Attendance & GPS</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-8 rounded-[40px] border border-gray-50 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
            <style dangerouslySetInnerHTML={{ __html: `.fc { --fc-border-color: #f3f4f6; font-family: inherit; } .fc .fc-toolbar-title { font-weight: 900; text-transform: uppercase; font-style: italic; font-size: 1.1rem !important; } .fc .fc-button-primary { background-color: #f9fafb !important; border: 1px solid #f3f4f6 !important; color: #111827 !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 0.65rem !important; border-radius: 12px !important; } .fc .fc-button-primary:hover { background-color: #2563eb !important; color: white !important; } .fc-event { border-radius: 8px !important; padding: 3px 6px !important; cursor: pointer; border: none !important; }`}} />
            <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }} events={events} eventClick={handleEventClick} height="auto" />
          </div>
        </>
      )}

      {/* --- SHIFT LOGS MODAL WITH GPS VERIFICATION --- */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">Shift Logs</h3>
              <p className="text-blue-100 font-bold text-sm">{selectedEvent.fullData.date}</p>
            </div>
            
            <div className="p-8 space-y-4">
              
              {/* Punch In + GPS */}
              <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl border border-gray-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100"><Clock size={24}/></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Punch In</p>
                    <p className="font-black text-gray-900 text-lg leading-none">{selectedEvent.clockIn?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                {selectedEvent.inLocation && (
                  <a href={getMapLink(selectedEvent.inLocation)} target="_blank" className="p-3 bg-white text-blue-600 rounded-xl border border-blue-50 shadow-sm hover:bg-blue-600 hover:text-white transition-all group-hover:scale-105">
                    <MapPin size={20} />
                  </a>
                )}
              </div>

              {/* Punch Out + GPS */}
              <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl border border-gray-100 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-100"><Clock size={24}/></div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Punch Out</p>
                    <p className="font-black text-gray-900 text-lg leading-none">
                      {selectedEvent.clockOut ? selectedEvent.clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "In Progress"}
                    </p>
                  </div>
                </div>
                {selectedEvent.outLocation && (
                  <a href={getMapLink(selectedEvent.outLocation)} target="_blank" className="p-3 bg-white text-red-500 rounded-xl border border-red-50 shadow-sm hover:bg-red-500 hover:text-white transition-all group-hover:scale-105">
                    <MapPin size={20} />
                  </a>
                )}
              </div>

              {/* Today's Earning Box */}
              <div className="flex items-center gap-4 bg-green-50 p-5 rounded-3xl border border-green-100">
                <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200"><Banknote size={24}/></div>
                <div>
                  <p className="text-[10px] font-black text-green-600/70 uppercase tracking-widest leading-none mb-1">Today's Earning</p>
                  <p className="font-black text-green-700 text-xl leading-none italic tracking-tighter">{calculateEarning()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-2 pt-2">
                <CheckCircle2 className={`transition-colors ${selectedEvent.inLocation ? 'text-green-500' : 'text-gray-300'}`} size={20}/>
                <p className="text-xs font-bold text-gray-500">
                  {selectedEvent.inLocation ? "GPS Location Verified" : "Location Data Missing"}
                </p>
              </div>

              <button onClick={() => setIsModalOpen(false)} className="w-full mt-4 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-600 transition-all shadow-xl">Close Logs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}