"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Search,
  Loader2,
  ArrowLeft,
  Clock,
  Banknote,
  CheckCircle2,
  X,
  MapPin,
  Lock,
  Crown,
  Edit2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";

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

  const [view, setView] = useState<"staffList" | "calendar">("staffList");
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const [manualPunchOutTime, setManualPunchOutTime] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  const isTrialValid = () => {
    if (userData?.isPremium === false) return false;
    if (!userData?.createdAt) return false;

    const trialDays = 14;
    const createdDate = userData.createdAt?.toDate
      ? userData.createdAt.toDate()
      : new Date(userData.createdAt);

    const expiryDate = new Date(
      createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000
    );

    return new Date() < expiryDate;
  };

  const hasAccess = userData?.isPremium || isTrialValid();

  useEffect(() => {
    if (!authLoading && userData?.role === "Staff") {
      router.push("/attendance");
    }
  }, [userData, authLoading, router]);

  useEffect(() => {
    if (authLoading || !userData?.uid || userData?.role === "Staff") return;

    setLoading(true);

    const adminUid = userData.uid;

    const q = query(
      collection(db, "employees"),
      where("adminUid", "==", adminUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setEmployees(data);
        setLoading(false);
      },
      (error) => {
        console.error("Employees fetch error:", error);
        notify("Unable to load staff logs.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, userData?.uid, userData?.role]);

  useEffect(() => {
    if (view !== "calendar" || !selectedEmp || !userData?.uid) return;

    const adminUid = userData.uid;

    const q = query(
      collection(db, "attendance"),
      where("employeeName", "==", selectedEmp.name),
      where("adminUid", "==", adminUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const attendanceData = snap.docs.map((document) => {
          const data = document.data();
          const clockInDate = data.clockIn?.toDate?.() || null;
          const clockOutDate = data.clockOut?.toDate?.() || null;

          return {
            id: document.id,
            title: `IN: ${
              clockInDate
                ? clockInDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"
            }`,
            start: data.date,
            extendedProps: {
              docId: document.id,
              fullData: data,
              clockIn: clockInDate,
              clockOut: clockOutDate,
              inLocation: data.clockInLocation || null,
              outLocation: data.clockOutLocation || null,
              manualPunchOut: data.manualPunchOut || false,
            },
            backgroundColor: clockOutDate ? "#16a34a" : "#2563eb",
            borderColor: clockOutDate ? "#16a34a" : "#2563eb",
          };
        });

        setEvents(attendanceData);
      },
      (error) => {
        console.error("Attendance fetch error:", error);
        notify("Unable to load attendance records.");
      }
    );

    return () => unsubscribe();
  }, [selectedEmp, view, userData?.uid]);

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
    setManualPunchOutTime("");
    setIsModalOpen(true);
  };

  const getMapLink = (loc: { lat: number; lng: number }) => {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  };

  const calculateEarning = () => {
    if (!selectedEvent?.clockOut) return "Shift In Progress...";

    const baseSalary = parseFloat(selectedEmp?.salary || "0");

    if (baseSalary === 0) return "Base Salary Not Set";

    const diffMs =
      selectedEvent.clockOut.getTime() - selectedEvent.clockIn.getTime();

    const diffMins = Math.max(0, diffMs / (1000 * 60));
    const perMinRate = baseSalary / 30 / 9 / 60;
    const earned = diffMins * perMinRate;

    return `PKR ${earned.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleManualPunchOut = async () => {
    if (!selectedEvent?.docId) {
      notify("Attendance record missing.");
      return;
    }
  
    if (!selectedEvent?.clockIn) {
      notify("Clock-in record missing.");
      return;
    }
  
    if (selectedEvent?.clockOut) {
      notify("This shift is already completed.");
      return;
    }
  
    if (!manualPunchOutTime) {
      notify("Please select punch-out time.");
      return;
    }
  
    const recordDate = selectedEvent.fullData?.date;
  
    if (!recordDate) {
      notify("Attendance date missing.");
      return;
    }
  
    const [rawHour, rawMinute] = manualPunchOutTime.split(":").map(Number);
  
    let manualOutDate = new Date(recordDate);
    manualOutDate.setHours(rawHour, rawMinute, 0, 0);
  
    // ✅ Fix: If browser returns 06:00 but user means 06:00 PM,
    // and punch-in is already after that time, convert it to PM.
    if (manualOutDate <= selectedEvent.clockIn && rawHour < 12) {
      manualOutDate.setHours(rawHour + 12, rawMinute, 0, 0);
    }
  
    // ✅ Overnight shift fallback: if still before punch-in, move to next day
    if (manualOutDate <= selectedEvent.clockIn) {
      const nextDayOut = new Date(manualOutDate);
      nextDayOut.setDate(nextDayOut.getDate() + 1);
  
      if (nextDayOut > selectedEvent.clockIn) {
        manualOutDate = nextDayOut;
      }
    }
  
    if (manualOutDate <= selectedEvent.clockIn) {
      notify("Punch-out time must be after punch-in time.");
      return;
    }
  
    setManualSaving(true);
  
    try {
      await updateDoc(doc(db, "attendance", selectedEvent.docId), {
        clockOut: manualOutDate,
        clockOutLocation: null,
        manualPunchOut: true,
        manualPunchOutBy: userData?.uid || "",
        manualPunchOutByName: userData?.name || "Manager",
        manualPunchOutAt: serverTimestamp(),
        status: "Completed",
        updatedAt: serverTimestamp(),
      });
  
      setSelectedEvent({
        ...selectedEvent,
        clockOut: manualOutDate,
        outLocation: null,
        manualPunchOut: true,
      });
  
      notify("Manual punch-out time saved successfully.");
    } catch (error) {
      console.error("Manual punch-out error:", error);
      notify("Failed to save manual punch-out.");
    } finally {
      setManualSaving(false);
    }
  };

  if (authLoading || userData?.role === "Staff") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
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

              <p className="text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">
                Select employee to verify GPS & Logs
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-end md:items-center gap-4 w-full md:w-auto">
              {userData?.isPremium ? (
                <div className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                  <Crown size={12} /> Premium Active
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 text-yellow-600 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                  <Clock size={12} />{" "}
                  {userData?.isPremium === false
                    ? "Trial Expired"
                    : "14-Day Free Trial"}
                </div>
              )}

              <div className="bg-white flex items-center gap-3 px-6 py-3 rounded-[24px] border border-gray-100 shadow-sm w-full md:w-auto">
                <Search className="text-gray-400" size={18} />

                <input
                  type="text"
                  placeholder="Search staff..."
                  className="bg-transparent border-none outline-none w-full font-bold text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {employees
                .filter((emp) =>
                  (emp.name || "")
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => openCalendar(emp)}
                    className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center font-black italic text-2xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {(emp.name || "A")[0]}
                    </div>

                    <h3 className="text-lg font-black uppercase italic leading-none truncate">
                      {emp.name || "Unnamed Staff"}
                    </h3>

                    <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">
                      {emp.designation || "Staff"}
                    </p>

                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between transition-colors text-gray-400 group-hover:text-gray-900">
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {hasAccess ? "Open Analytics" : "Analytics Locked"}
                      </span>

                      {hasAccess ? (
                        <ArrowLeft size={16} className="rotate-180" />
                      ) : (
                        <Lock size={16} className="text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={closeCalendar}
                className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center text-gray-900 hover:bg-gray-900 hover:text-white transition-all"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none">
                  {selectedEmp?.name}'s{" "}
                  <span className="text-blue-600">Logs</span>
                </h1>

                <p className="text-gray-400 font-bold text-xs uppercase mt-2 tracking-widest">
                  Reviewing Attendance & GPS
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-8 rounded-[40px] border border-gray-50 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                  .fc { --fc-border-color: #f3f4f6; font-family: inherit; }
                  .fc .fc-toolbar-title { font-weight: 900; text-transform: uppercase; font-style: italic; font-size: 1.1rem !important; }
                  .fc .fc-button-primary { background-color: #f9fafb !important; border: 1px solid #f3f4f6 !important; color: #111827 !important; font-weight: 800 !important; text-transform: uppercase !important; font-size: 0.65rem !important; border-radius: 12px !important; }
                  .fc .fc-button-primary:hover { background-color: #2563eb !important; color: white !important; }
                  .fc-event { border-radius: 8px !important; padding: 3px 6px !important; cursor: pointer; border: none !important; }
                `,
              }}
            />

            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={events}
              eventClick={handleEventClick}
              height="auto"
            />
          </div>
        </>
      )}

      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-white/20">
            <div className="bg-blue-600 p-8 text-white relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                Shift Logs
              </h3>

              <p className="text-blue-100 font-bold text-sm">
                {selectedEvent.fullData.date}
              </p>
            </div>

            <div className="p-8 space-y-4">
              <LogRow
                color="blue"
                label="Punch In"
                value={
                  selectedEvent.clockIn
                    ? selectedEvent.clockIn.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Missing"
                }
                location={selectedEvent.inLocation}
                getMapLink={getMapLink}
              />

              <LogRow
                color="red"
                label="Punch Out"
                value={
                  selectedEvent.clockOut
                    ? selectedEvent.clockOut.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "In Progress"
                }
                location={selectedEvent.outLocation}
                getMapLink={getMapLink}
                manual={selectedEvent.manualPunchOut}
              />

              {!selectedEvent.clockOut && (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <Edit2 size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Manual Punch Out
                    </p>
                  </div>

                  <p className="text-xs font-bold text-red-500/80 italic leading-relaxed">
                    Use this only when employee forgot to clock out. Punch-in
                    time cannot be changed from here.
                  </p>

                  <input
                    type="time"
                    value={manualPunchOutTime}
                    onChange={(e) => setManualPunchOutTime(e.target.value)}
                    className="w-full bg-white border border-red-100 rounded-2xl p-4 outline-none font-black text-gray-900 focus:border-red-500"
                  />

                  <button
                    onClick={handleManualPunchOut}
                    disabled={manualSaving}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 hover:bg-red-600 transition-all disabled:opacity-60"
                  >
                    {manualSaving ? "Saving..." : "Set Manual Punch Out"}
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 bg-green-50 p-5 rounded-3xl border border-green-100">
                <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                  <Banknote size={24} />
                </div>

                <div>
                  <p className="text-[10px] font-black text-green-600/70 uppercase tracking-widest leading-none mb-1">
                    Today's Earning
                  </p>

                  <p className="font-black text-green-700 text-xl leading-none italic tracking-tighter">
                    {calculateEarning()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-2 pt-2">
                <CheckCircle2
                  className={`transition-colors ${
                    selectedEvent.inLocation ? "text-green-500" : "text-gray-300"
                  }`}
                  size={20}
                />

                <p className="text-xs font-bold text-gray-500">
                  {selectedEvent.inLocation
                    ? "GPS Location Verified"
                    : "Location Data Missing"}
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-4 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-600 transition-all shadow-xl"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {isPremiumModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-xl"
            onClick={() => setIsPremiumModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-md rounded-[50px] overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-yellow-100">
            <button
              onClick={() => setIsPremiumModalOpen(false)}
              className="absolute top-6 right-6 z-10 bg-white/20 text-white p-2 rounded-full backdrop-blur-md hover:bg-white/40 transition-all"
            >
              <X size={18} />
            </button>

            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />

              <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-xl">
                <Crown size={32} className="text-white" />
              </div>

              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                Unlock Premium
              </h3>

              <p className="text-yellow-100 text-[10px] font-bold uppercase mt-2 tracking-widest">
                PKR 5,000 / Month
              </p>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-gray-500 font-bold italic text-sm text-center leading-relaxed">
                Premium access ke liye payment transfer karein aur WhatsApp par
                screenshot bhej dein.
              </p>

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
      )}
    </div>
  );
}

function LogRow({
  color,
  label,
  value,
  location,
  getMapLink,
  manual,
}: {
  color: "blue" | "red";
  label: string;
  value: string;
  location: any;
  getMapLink: (loc: { lat: number; lng: number }) => string;
  manual?: boolean;
}) {
  const colorClass =
    color === "blue"
      ? "bg-blue-600 text-white shadow-blue-100 text-blue-600 hover:bg-blue-600"
      : "bg-red-500 text-white shadow-red-100 text-red-500 hover:bg-red-500";

  return (
    <div className="flex items-center justify-between bg-gray-50 p-5 rounded-3xl border border-gray-100 group">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 ${
            color === "blue" ? "bg-blue-600" : "bg-red-500"
          } text-white rounded-2xl flex items-center justify-center shadow-lg ${
            color === "blue" ? "shadow-blue-100" : "shadow-red-100"
          }`}
        >
          <Clock size={24} />
        </div>

        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
            {label}
          </p>

          <p className="font-black text-gray-900 text-lg leading-none">
            {value}
          </p>

          {manual && (
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-2">
              Manually Set
            </p>
          )}
        </div>
      </div>

      {location && (
        <a
          href={getMapLink(location)}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-3 bg-white ${
            color === "blue" ? "text-blue-600" : "text-red-500"
          } rounded-xl border ${
            color === "blue" ? "border-blue-50" : "border-red-50"
          } shadow-sm ${
            color === "blue"
              ? "hover:bg-blue-600"
              : "hover:bg-red-500"
          } hover:text-white transition-all group-hover:scale-105`}
        >
          <MapPin size={20} />
        </a>
      )}
    </div>
  );
}