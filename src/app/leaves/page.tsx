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
  orderBy 
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Calendar,
  UserMinus,
  Settings2,
  AlertCircle
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function MyLeavesPage() {
  const { userData, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formType, setFormType] = useState("leave"); // 'leave' or 'resignation'
  const [history, setHistory] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({ 
    type: "Sick Leave", 
    start: "", 
    end: "", 
    reason: "" 
  });

  // 1. Fetch Combined History (Leaves + Resignations)
  useEffect(() => {
    if (!user) return;

    // Real-time listener for Leaves
    const qL = query(
      collection(db, "leaves"), 
      where("uid", "==", user.uid),
      orderBy("submittedAt", "desc")
    );

    const unsubL = onSnapshot(qL, (snapL) => {
      const LData = snapL.docs.map(doc => ({ 
        id: doc.id, 
        category: 'Leave', 
        ...doc.data() 
      }));

      // Real-time listener for Resignations
      const qR = query(
        collection(db, "resignations"), 
        where("uid", "==", user.uid),
        orderBy("submittedAt", "desc")
      );

      const unsubR = onSnapshot(qR, (snapR) => {
        const RData = snapR.docs.map(doc => ({ 
          id: doc.id, 
          category: 'Resignation', 
          ...doc.data() 
        }));

        // Merge and show all requests
        const combined = [...LData, ...RData].sort((a: any, b: any) => {
          return (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0);
        });
        
        setHistory(combined);
        setLoading(false);
      });

      return () => unsubR();
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubL();
  }, [user]);

  // 2. Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.reason || (formType === 'leave' && (!formData.start || !formData.end))) {
      notify("Please Complete All Feilds");
      return;
    }

    const collectionName = formType === "leave" ? "leaves" : "resignations";

    try {
      await addDoc(collection(db, collectionName), {
        uid: user.uid,
        employeeName: userData?.name || "Anonymous",
        ...(formType === 'leave' && { 
          type: formData.type, 
          startDate: formData.start, 
          endDate: formData.end 
        }),
        reason: formData.reason,
        status: "Pending",
        submittedAt: serverTimestamp(),
      });

      // Reset form
      setFormData({ type: "Sick Leave", start: "", end: "", reason: "" });
      notify(`${formType === 'leave' ? 'Leave' : 'Resignation'} request dispatched! 🚀`);
    } catch (err) {
      console.error("Submission Error:", err);
      notify("Something missing, Try again");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-10 animate-in fade-in duration-700 pb-20 mt-4">
      
      {/* Header & Main Switcher */}
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
            onClick={() => setFormType("leave")}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${formType === 'leave' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
          >
            <Calendar size={14} /> Apply Leave
          </button>
          <button 
            onClick={() => setFormType("resignation")}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${formType === 'resignation' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
          >
            <UserMinus size={14} /> Resignation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* LEFT: FORM SECTION - FIX: Hata diya 'sticky top-8', ab 'relative' hai */}
        <div className="bg-white p-10 rounded-[50px] border border-gray-100 shadow-2xl h-fit relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${formType === 'leave' ? 'text-blue-600' : 'text-red-600'}`}>
               {formType === 'leave' ? "New Application" : "Final Notice"}
            </h3>
            {formType === 'leave' && <Settings2 size={18} className="text-gray-300" />}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {formType === 'leave' && (
              <>
                {/* Leave Type Dropdown with CUSTOM option */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">Category</label>
                  <select 
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-gray-700 outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                    value={formData.type} 
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Sick Leave</option>
                    <option>Casual Leave</option>
                    <option>Annual Leave</option>
                    <option>Emergency</option>
                    <option>Custom</option> 
                  </select>
                </div>
                
                {/* Modified Calendars */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">Start Date</label>
                    <input 
                      type="date" 
                      className="p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-sm w-full outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-600 transition-all text-gray-700" 
                      onChange={(e) => setFormData({...formData, start: e.target.value})} 
                      value={formData.start} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">End Date</label>
                    <input 
                      type="date" 
                      className="p-5 bg-gray-50 border border-gray-200 rounded-3xl font-bold text-sm w-full outline-none focus:ring-2 focus:ring-blue-50 focus:border-blue-600 transition-all text-gray-700" 
                      onChange={(e) => setFormData({...formData, end: e.target.value})} 
                      value={formData.end} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* Reason Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">Reason / Description</label>
              <textarea 
                placeholder={formType === 'leave' ? "Why do you need leave?..." : "Reason for leaving the company..."}
                className="w-full p-6 bg-gray-50 border border-gray-200 rounded-[35px] h-32 font-bold outline-none focus:border-blue-600 focus:bg-white transition-all resize-none shadow-inner text-gray-700"
                value={formData.reason} 
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>

            <button className={`w-full py-6 text-white rounded-[30px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 group ${formType === 'leave' ? 'bg-blue-600 hover:bg-gray-900 shadow-blue-100' : 'bg-red-600 hover:bg-black shadow-red-100'}`}>
              <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              {formType === 'leave' ? "Dispatch Application" : "Submit Resignation"}
            </button>
          </form>
        </div>

        {/* RIGHT: UNIFIED HISTORY */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Personal Archives</h3>
            <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase tracking-tighter italic">
              {history.length} Total Logs
            </span>
          </div>

          <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-gray-50">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Loading History...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((req) => (
                <div 
                  key={req.id} 
                  className="bg-white p-7 rounded-[40px] border border-gray-50 shadow-sm flex items-center justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-[24px] shadow-inner ${
                      req.status === 'Approved' ? 'bg-green-50 text-green-600' : 
                      req.status === 'Rejected' ? 'bg-red-50 text-red-600' : 
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {req.category === 'Leave' ? <Calendar size={24} /> : <UserMinus size={24} />}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 uppercase italic text-sm leading-none tracking-tight">
                        {req.category === 'Leave' ? req.type : "Resignation Notice"}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase italic flex items-center gap-2">
                        {req.category === 'Leave' ? `${req.startDate} — ${req.endDate}` : "Final Submission"}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-tighter ${
                    req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                    req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {req.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-24 text-center bg-gray-50 rounded-[50px] border border-dashed border-gray-200 flex flex-col items-center gap-4">
                <AlertCircle size={40} className="text-gray-200" />
                <p className="font-black text-gray-300 uppercase italic text-xs tracking-[0.2em]">No Records Found</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}