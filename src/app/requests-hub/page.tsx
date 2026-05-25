"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Check,
  X,
  Loader2,
  ClipboardList,
  Clock,
  Lock,
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function RequestsHub() {
  const { userData, user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leaves");
  const [view, setView] = useState("pending");

  const [leaves, setLeaves] = useState<any[]>([]);
  const [resignations, setResignations] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);

  const workspaceUid =
    userData?.workspaceUid || userData?.adminUid || userData?.uid;

  useEffect(() => {
    if (authLoading || !user?.uid || !workspaceUid) return;

    const qLeaves = query(
      collection(db, "leaves"),
      where("adminUid", "==", workspaceUid)
    );

    const qResign = query(
      collection(db, "resignations"),
      where("adminUid", "==", workspaceUid)
    );

    const qOvertime = query(
      collection(db, "attendance"),
      where("adminUid", "==", workspaceUid)
    );

    const unsubLeaves = onSnapshot(qLeaves, (snap) => {
      setLeaves(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubResign = onSnapshot(qResign, (snap) => {
      setResignations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubOvertime = onSnapshot(qOvertime, (snap) => {
      const overtimeRecords = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r: any) =>
          ["Pending", "Approved", "Rejected"].includes(
            r.overtimeApprovalStatus
          )
        );

      setOvertimes(overtimeRecords);
      setLoading(false);
    });

    return () => {
      unsubLeaves();
      unsubResign();
      unsubOvertime();
    };
  }, [authLoading, user?.uid, workspaceUid]);

  const toDateSafe = (value: any) => {
    if (!value) return null;
    if (value?.toDate) return value.toDate();
    return new Date(value);
  };

  const buildShiftDate = (dateString: string, timeString: string) => {
    const [hours, minutes] = (timeString || "18:00").split(":").map(Number);
    const date = new Date(dateString);
    date.setHours(hours || 18, minutes || 0, 0, 0);
    return date;
  };

  const handleStatus = async (
    id: string,
    newStatus: string,
    collectionName: string
  ) => {
    try {
      await updateDoc(doc(db, collectionName, id), {
        status: newStatus,
        actionBy: userData?.name || "Admin",
        actionAt: serverTimestamp(),
      });

      notify(`Request ${newStatus}!`);
    } catch (err) {
      console.error(err);
      notify("Action failed!");
    }
  };

  const handleOvertimeAction = async (record: any, action: "Approved" | "Rejected") => {
    try {
      const ref = doc(db, "attendance", record.id);

      if (action === "Approved") {
        await updateDoc(ref, {
          approvedOvertimeMinutes: Number(record.overtimeMinutes || 0),
          overtimeApprovalStatus: "Approved",
          overtimeActionBy: userData?.name || "Admin",
          overtimeActionAt: serverTimestamp(),
          status: "Completed",
          updatedAt: serverTimestamp(),
        });

        notify("Overtime approved successfully.");
        return;
      }

      const clockInDate = toDateSafe(record.clockIn);
      const shiftEndDate = buildShiftDate(record.date, record.shiftEnd || "18:00");

      let workedMinutes = 0;

      if (clockInDate && shiftEndDate) {
        workedMinutes = Math.max(
          0,
          Math.round((shiftEndDate.getTime() - clockInDate.getTime()) / 60000)
        );
      }

      await updateDoc(ref, {
        clockOut: shiftEndDate,
        manualClockOutBySystem: true,
        manualClockOutReason: "Overtime rejected by management",
        workedMinutes,
        overtimeMinutes: 0,
        approvedOvertimeMinutes: 0,
        overtimeApprovalStatus: "Rejected",
        overtimeActionBy: userData?.name || "Admin",
        overtimeActionAt: serverTimestamp(),
        status: "Completed",
        updatedAt: serverTimestamp(),
      });

      notify("Overtime rejected. Shift end time has been applied.");
    } catch (err) {
      console.error(err);
      notify("Overtime action failed.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>

        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900">
          Access Denied
        </h2>

        <p className="text-gray-500 font-bold mt-4 max-w-sm italic">
          Ye area sirf Management ke liye reserved hai.
        </p>
      </div>
    );
  }

  const currentData =
    activeTab === "leaves"
      ? leaves
      : activeTab === "resignations"
      ? resignations
      : overtimes;

  const pendingRequests =
    activeTab === "overtime"
      ? currentData.filter((r) => r.overtimeApprovalStatus === "Pending")
      : currentData.filter((r) => r.status === "Pending");

  const historyRequests =
    activeTab === "overtime"
      ? currentData.filter((r) => r.overtimeApprovalStatus !== "Pending")
      : currentData.filter((r) => r.status !== "Pending");

  const displayList = view === "pending" ? pendingRequests : historyRequests;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20 px-4 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black italic uppercase text-gray-900 tracking-tighter leading-none">
            Requests <span className="text-blue-600">Hub</span>
          </h1>

          <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-widest ml-1">
            Management Control
          </p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-[24px] flex items-center gap-1 shadow-inner overflow-x-auto max-w-full">
          <TabButton
            label={`Leaves (${leaves.filter((r) => r.status === "Pending").length})`}
            active={activeTab === "leaves"}
            onClick={() => setActiveTab("leaves")}
          />

          <TabButton
            label={`Resignations (${resignations.filter((r) => r.status === "Pending").length})`}
            active={activeTab === "resignations"}
            onClick={() => setActiveTab("resignations")}
          />

          <TabButton
            label={`Overtime (${overtimes.filter((r) => r.overtimeApprovalStatus === "Pending").length})`}
            active={activeTab === "overtime"}
            onClick={() => setActiveTab("overtime")}
          />
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-100 pb-2">
        <button
          onClick={() => setView("pending")}
          className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            view === "pending" ? "text-blue-600" : "text-gray-300"
          }`}
        >
          Pending
        </button>

        <button
          onClick={() => setView("history")}
          className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            view === "history" ? "text-blue-600" : "text-gray-300"
          }`}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.length > 0 ? (
            displayList.map((req) => (
              <div
                key={req.id}
                className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center font-black italic text-2xl shadow-inner">
                    {req.employeeName ? req.employeeName[0] : "?"}
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-gray-900 uppercase italic leading-none">
                      {req.employeeName}
                    </h4>

                    <p className="text-gray-400 font-bold text-[10px] mt-2 uppercase tracking-widest italic">
                      {activeTab === "leaves"
                        ? `${req.type} | ${req.startDate} - ${req.endDate}`
                        : activeTab === "resignations"
                        ? "Resignation Request"
                        : `Overtime Request | ${Math.round(
                            Number(req.overtimeMinutes || 0)
                          )} minutes`}
                    </p>

                    <p className="text-gray-500 text-xs mt-3 italic bg-gray-50 p-4 rounded-2xl">
                      {activeTab === "overtime"
                        ? `Shift: ${req.shiftStart || "09:00"} - ${
                            req.shiftEnd || "18:00"
                          } | Date: ${req.date}`
                        : `"${req.reason || "No reason provided"}"`}
                    </p>
                  </div>
                </div>

                {view === "pending" ? (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        activeTab === "overtime"
                          ? handleOvertimeAction(req, "Approved")
                          : handleStatus(req.id, "Approved", activeTab)
                      }
                      className="bg-green-500 text-white p-5 rounded-2xl hover:bg-green-600 shadow-lg active:scale-95 transition-all"
                    >
                      <Check size={24} />
                    </button>

                    <button
                      onClick={() =>
                        activeTab === "overtime"
                          ? handleOvertimeAction(req, "Rejected")
                          : handleStatus(req.id, "Rejected", activeTab)
                      }
                      className="bg-red-500 text-white p-5 rounded-2xl hover:bg-red-600 shadow-lg active:scale-95 transition-all"
                    >
                      <X size={24} />
                    </button>
                  </div>
                ) : (
                  <div className="text-right flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-tighter ${
                        (activeTab === "overtime"
                          ? req.overtimeApprovalStatus
                          : req.status) === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {activeTab === "overtime"
                        ? req.overtimeApprovalStatus
                        : req.status}
                    </span>

                    <p className="text-[8px] font-black text-gray-400 uppercase italic">
                      Action By:{" "}
                      {activeTab === "overtime"
                        ? req.overtimeActionBy || "-"
                        : req.actionBy || "-"}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-gray-50 p-20 rounded-[50px] border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
              <ClipboardList size={40} className="text-gray-200" />

              <p className="font-black text-gray-300 uppercase italic tracking-widest text-sm">
                No {view} {activeTab} found.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
        active ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}