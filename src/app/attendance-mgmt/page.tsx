"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore"; 
import { 
  Search, Loader2, ArrowLeft, Clock, Banknote, 
  CheckCircle2, X, MapPin, ExternalLink, Activity,
  Lock, Crown // 👈 Icons added for premium
} from "lucide-react";
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation"; 
import { notify } from "@/lib/notify"; // 👈 Notify import added

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

  // 💎 Premium SaaS State
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // ⏱️ SaaS Trial Logic & Kill Switch
  const isTrialValid = () => {
    // 🛡️ THE KILL SWITCH: Explicit downgrade pe trial cancel
    if (userData?.isPremium === false) return false;

    if (!userData?.createdAt) return false;
    const trialDays = 14;
    const createdDate = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const expiryDate = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
    return new Date() < expiryDate;
  };

  const hasAccess = userData?.isPremium || isTrialValid();

  // 🛡️ SECURITY GUARD
  useEffect(() => {
    if (!authLoading && userData?.role === "Staff") {
      router.push("/attendance"); 
    }
  }, [userData, authLoading, router]);

  // 🛡️ 1. Fetch Employees (FILTERED BY ADMIN)
  useEffect(() => {
    if (authLoading || !userData?.uid || userData?.role === "Staff") return; 

    const q = query(collection(db, "employees"), where("adminUid", "==", userData.uid));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [authLoading, userData]);

  // 🛡️ 2. Fetch Selected Employee's Attendance (FILTERED BY ADMIN)
  useEffect(() => {
    if (view !== "calendar" || !selectedEmp || !userData?.uid) return;

    const q = query(
      collection(db, "attendance"), 
      where("employeeName", "==", selectedEmp.name),
      where("adminUid", "==", userData.uid) 
    );

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
  }, [selectedEmp, view, userData]);

  // 🛠️ Handlers (Updated for Premium)
  const openCalendar = (emp: any) => {
    if (hasAccess) {
      setSelectedEmp(emp);
      setView("calendar");
    } else {
      setIsPremiumModalOpen(true);
    }
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
    return `PKR ${earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (authLoading || userData?.role === "Staff") {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4 text-gray-900">
      
      {view === "staffList" ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none">
                Staff <span className="text-blue-600">Logs</span>
              </h1>
              <p className="text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">Select employee to verify GPS & Logs</p>
            </div>
            
            <div className="flex flex-col md:flex-row items-end md:items-center gap-4 w-full md:w-auto">
              {/* 💎 SAAS BADGE */}
              {userData?.isPremium ? (
                 <div className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                   <Crown size={12} /> Premium Active
                 </div>
              ) : (
                 <div className="bg-yellow-50 border border-yellow-100 text-yellow-600 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                   <Clock size={12} /> {userData?.isPremium === false ? "Trial Expired" : "14-Day Free Trial"}
                 </div>
              )}

              <div className="bg-white flex items-center gap-3 px-6 py-3 rounded-[24px] border border-gray-100 shadow-sm w-full md:w-auto">
                <Search className="text-gray-400" size={18} />
                <input type="text" placeholder="Search staff..." className="bg-transparent border-none outline-none w-full font-bold text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => (
              <div key={emp.id} onClick={() => openCalendar(emp)} className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center font-black italic text-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">{emp.name[0]}</div>
                <h3 className="text-lg font-black uppercase italic leading-none truncate">{emp.name}</h3>
                <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">{emp.designation || "Staff"}</p>
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between transition-colors text-gray-400 group-hover:text-gray-900">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {hasAccess ? "Open Analytics" : "Analytics Locked"}
                  </span>
                  {/* 🔒 Lock Icon Agar Premium Nahi Hai */}
                  {hasAccess ? <ArrowLeft size={16} className="rotate-180" /> : <Lock size={16} className="text-amber-500" />}
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
                <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none">{selectedEmp?.name}'s <span className="text-blue-600">Logs</span></h1>
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

      {/* --- SHIFT LOGS MODAL --- */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24}/></button>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">Shift Logs</h3>
              <p className="text-blue-100 font-bold text-sm">{selectedEvent.fullData.date}</p>
            </div>
            
            <div className="p-8 space-y-4">
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

      {/* 💎 PREMIUM UPGRADE MODAL (MANUAL BILLING) */}
      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-xl" onClick={() => setIsPremiumModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-yellow-100">
            <button onClick={() => setIsPremiumModalOpen(false)} className="absolute top-6 right-6 z-10 bg-white/20 text-white p-2 rounded-full backdrop-blur-md hover:bg-white/40 transition-all"><X size={18} /></button>
            
            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-xl">
                <Crown size={32} className="text-white" />
              </div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">Unlock Premium</h3>
              <p className="text-yellow-100 text-[10px] font-bold uppercase mt-2 tracking-widest">PKR 5,000 / Month</p>
            </div>
            
            <div className="p-8 space-y-6">
              <p className="text-gray-500 font-bold italic text-sm text-center leading-relaxed">
                Premium access ke liye neechay diye gaye account mein payment transfer karein aur WhatsApp par screenshot bhej dein.
              </p>
              
              {/* 🏦 Bank Details Box */}
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3 shadow-inner">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bank</span>
                  <span className="font-black text-sm italic text-gray-900 uppercase">Meezan Bank</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</span>
                  <span className="font-black text-sm italic text-gray-900 uppercase">ALIYAN ASIF</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account #</span>
                  <span className="font-black text-sm italic text-gray-900 tracking-wider">00300114548188</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">IBAN</span>
                  <span className="font-black text-xs italic text-gray-900 tracking-wider">PK16MEZN0000300114548188</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Branch</span>
                  <span className="font-black text-[10px] italic text-gray-900 text-right uppercase">MEEZAN DIGITAL CENTRE</span>
                </div>
              </div>

              {/* 💬 WhatsApp Action Button */}
              <div className="flex flex-col gap-3 pt-2">
                <a 
                  href="https://wa.me/message/IUY2YDEDHTFTN1" 
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsPremiumModalOpen(false)}
                  className="w-full py-4 bg-[#25D366] text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-[#128C7E] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Send Slip on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}