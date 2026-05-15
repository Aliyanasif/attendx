"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
  Send,
  Loader2,
  Calendar,
  UserMinus,
  Settings2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function MyLeavesPage() {
  const { userData, user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formType, setFormType] = useState<"leave" | "resignation">("leave");
  const [history, setHistory] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    type: "Sick Leave",
    start: "",
    end: "",
    reason: "",
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user?.uid) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let leavesData: any[] = [];
    let resignationsData: any[] = [];

    const mergeHistory = () => {
      const combined = [...leavesData, ...resignationsData].sort(
        (a: any, b: any) => {
          return (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0);
        }
      );

      setHistory(combined);
      setLoading(false);
    };

    const leavesQuery = query(
      collection(db, "leaves"),
      where("uid", "==", user.uid),
      orderBy("submittedAt", "desc")
    );

    const resignationsQuery = query(
      collection(db, "resignations"),
      where("uid", "==", user.uid),
      orderBy("submittedAt", "desc")
    );

    const unsubLeaves = onSnapshot(
      leavesQuery,
      (snap) => {
        leavesData = snap.docs.map((doc) => ({
          id: doc.id,
          category: "Leave",
          ...doc.data(),
        }));

        mergeHistory();
      },
      (error) => {
        console.error("Leaves Firestore Error:", error);
        notify("Unable to load leave history.");
        setLoading(false);
      }
    );

    const unsubResignations = onSnapshot(
      resignationsQuery,
      (snap) => {
        resignationsData = snap.docs.map((doc) => ({
          id: doc.id,
          category: "Resignation",
          ...doc.data(),
        }));

        mergeHistory();
      },
      (error) => {
        console.error("Resignations Firestore Error:", error);
        notify("Unable to load resignation history.");
        setLoading(false);
      }
    );

    return () => {
      unsubLeaves();
      unsubResignations();
    };
  }, [authLoading, user?.uid]);

  const resetForm = () => {
    setFormData({
      type: "Sick Leave",
      start: "",
      end: "",
      reason: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      notify("Please login again.");
      return;
    }

    if (!userData?.adminUid) {
      notify("Account mapping missing. Please contact admin.");
      return;
    }

    if (!formData.reason.trim()) {
      notify("Please enter a reason.");
      return;
    }

    if (formType === "leave") {
      if (!formData.start || !formData.end) {
        notify("Please select start and end date.");
        return;
      }

      if (new Date(formData.end) < new Date(formData.start)) {
        notify("End date cannot be before start date.");
        return;
      }
    }

    const collectionName = formType === "leave" ? "leaves" : "resignations";

    setSubmitting(true);

    try {
      await addDoc(collection(db, collectionName), {
        uid: user.uid,
        employeeName: userData?.name || user.displayName || "Anonymous",
        employeeEmail: userData?.email || user.email || "",
        adminUid: userData.adminUid,
        officeName: userData?.officeName || "",
        ...(formType === "leave" && {
          type: formData.type,
          startDate: formData.start,
          endDate: formData.end,
        }),
        reason: formData.reason.trim(),
        status: "Pending",
        submittedAt: serverTimestamp(),
      });

      resetForm();
      notify(
        `${formType === "leave" ? "Leave" : "Resignation"} request submitted successfully! 🚀`
      );
    } catch (err) {
      console.error("Submission Error:", err);
      notify("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchFormType = (type: "leave" | "resignation") => {
    setFormType(type);
    resetForm();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700 pb-20 mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-black italic uppercase text-gray-900 tracking-tighter leading-none">
            Request <span className="text-blue-600">Portal</span>
          </h1>

          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em] ml-1">
            Manage Leaves & Offboarding
          </p>
        </div>

        <div className="bg-gray-100 p-1.5 rounded-[24px] flex items-center gap-1 shadow-inner border border-gray-200">
          <button
            type="button"
            onClick={() => switchFormType("leave")}
            className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              formType === "leave"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Calendar size={14} /> Apply Leave
          </button>

          <button
            type="button"
            onClick={() => switchFormType("resignation")}
            className={`px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              formType === "resignation"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <UserMinus size={14} /> Resignation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[50px] border border-gray-100 shadow-2xl h-fit relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3
                className={`text-xs font-black uppercase tracking-[0.2em] ${
                  formType === "leave" ? "text-blue-600" : "text-red-600"
                }`}
              >
                {formType === "leave" ? "New Application" : "Final Notice"}
              </h3>

              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                {formType === "leave"
                  ? "Submit your leave request"
                  : "Submit formal resignation request"}
              </p>
            </div>

            {formType === "leave" ? (
              <Settings2 size={18} className="text-gray-300" />
            ) : (
              <ShieldCheck size={20} className="text-red-500" />
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {formType === "leave" && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">
                    Category
                  </label>

                  <select
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-gray-700 outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                  >
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>Annual Leave</option>
                    <option>Emergency</option>
                    <option>Custom</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">
                      Start Date
                    </label>

                    <input
                      type="date"
                      className="p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-sm w-full outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-600 transition-all text-gray-700"
                      onChange={(e) =>
                        setFormData({ ...formData, start: e.target.value })
                      }
                      value={formData.start}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">
                      End Date
                    </label>

                    <input
                      type="date"
                      className="p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-sm w-full outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-600 transition-all text-gray-700"
                      onChange={(e) =>
                        setFormData({ ...formData, end: e.target.value })
                      }
                      value={formData.end}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">
                Reason / Description
              </label>

              <textarea
                placeholder={
                  formType === "leave"
                    ? "Why do you need leave?..."
                    : "Reason for leaving the company..."
                }
                className={`w-full p-6 bg-gray-50 border border-gray-200 rounded-[35px] h-32 font-bold outline-none focus:bg-white transition-all resize-none shadow-inner text-gray-700 ${
                  formType === "leave"
                    ? "focus:border-blue-600"
                    : "focus:border-red-600"
                }`}
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>

            <button
              disabled={submitting}
              className={`w-full py-6 text-white rounded-[30px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 group disabled:opacity-70 ${
                formType === "leave"
                  ? "bg-blue-600 hover:bg-gray-900 shadow-blue-100"
                  : "bg-red-600 hover:bg-black shadow-red-100"
              }`}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send
                  size={18}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                />
              )}

              {submitting
                ? "Submitting..."
                : formType === "leave"
                  ? "Dispatch Application"
                  : "Submit Resignation"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Personal Archives
            </h3>

            <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase tracking-tighter italic">
              {history.length} Total Logs
            </span>
          </div>

          <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
            {loading || authLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-gray-50">
                <Loader2
                  className="animate-spin text-blue-600 mb-4"
                  size={32}
                />

                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                  Loading History...
                </p>
              </div>
            ) : history.length > 0 ? (
              history.map((req) => (
                <div
                  key={`${req.category}-${req.id}`}
                  className="bg-white p-6 md:p-7 rounded-[36px] md:rounded-[40px] border border-gray-50 shadow-sm flex items-center justify-between gap-4 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div
                      className={`p-4 rounded-[24px] shadow-inner shrink-0 ${
                        req.status === "Approved"
                          ? "bg-green-50 text-green-600"
                          : req.status === "Rejected"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {req.category === "Leave" ? (
                        <Calendar size={24} />
                      ) : (
                        <UserMinus size={24} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-black text-gray-900 uppercase italic text-sm leading-none tracking-tight truncate">
                        {req.category === "Leave"
                          ? req.type
                          : "Resignation Notice"}
                      </p>

                      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase italic flex items-center gap-2">
                        <Clock size={12} />
                        {req.category === "Leave"
                          ? `${req.startDate} — ${req.endDate}`
                          : "Final Submission"}
                      </p>

                      {req.reason && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-1 italic">
                          {req.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-black px-4 md:px-5 py-2 rounded-full uppercase tracking-tighter shrink-0 ${
                      req.status === "Approved"
                        ? "bg-green-100 text-green-700"
                        : req.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-16 md:p-24 text-center bg-gray-50 rounded-[40px] md:rounded-[50px] border border-dashed border-gray-200 flex flex-col items-center gap-4">
                <AlertCircle size={40} className="text-gray-200" />

                <p className="font-black text-gray-300 uppercase italic text-xs tracking-[0.2em]">
                  No Records Found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}