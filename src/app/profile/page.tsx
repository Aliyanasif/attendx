"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { 
  User, Mail, Briefcase, Clock, 
  Calendar, Shield, Banknote, LogOut, Loader2, AlertTriangle, X, Building2 // 👈 Building2 icon add kiya hai
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function ProfilePage() {
  const { userData, user } = useAuth();
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const displayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleResign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "resignations"), {
        uid: user?.uid,
        employeeName: userData?.name,
        email: userData?.email,
        reason: reason,
        status: "Pending",
        submittedAt: serverTimestamp(),
      });
      notify("Resignation request submitted to Admin.");
      setIsResignModalOpen(false);
    } catch (error) {
      notify("Error submitting request.");
    } finally {
      setLoading(false);
    }
  };

  const infoCards = [
    { icon: Briefcase, label: "Designation", value: userData?.designation || "Staff Member", color: "text-blue-600 bg-blue-50" },
    { icon: Clock, label: "Shift Timing", value: `${userData?.shiftStart || "--:--"} - ${userData?.shiftEnd || "--:--"}`, color: "text-orange-600 bg-orange-50" },
    { icon: Calendar, label: "Duty Hours", value: `${userData?.dutyHours || "9"} Hours/Day`, color: "text-purple-600 bg-purple-50" },
    { icon: Banknote, label: "Basic Salary", value: `Rs. ${userData?.salary?.toLocaleString() || "0"}`, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 mt-4 pb-24">

      {/* 🚀 MASSIVE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
            My <span className="text-blue-600">Profile</span>
          </h1>
          <p className="text-gray-400 font-black text-xs md:text-sm uppercase tracking-[0.3em] ml-1 mt-2 flex items-center gap-2">
            <User size={16} className="text-blue-600" /> Employee Portal
          </p>
        </div>
        <div className="bg-white px-6 py-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-3">
          <Calendar className="text-blue-600" size={24} />
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Today's Date</p>
            <p className="font-bold text-gray-900 text-sm italic">{displayDate}</p>
          </div>
        </div>
      </div>
      
      {/* Profile Card Header */}
      <div className="bg-white rounded-[48px] p-8 md:p-12 border border-gray-50 shadow-2xl shadow-blue-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 opacity-60"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-blue-200 shrink-0">
            {userData?.name ? userData.name[0] : "U"}
          </div>
          <div className="text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black text-gray-900 italic tracking-tight">{userData?.name}</h1>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                {userData?.role || "Staff"}
              </span>
            </div>
            
            <p className="text-gray-400 font-bold flex items-center justify-center md:justify-start gap-2">
              <Mail size={16} /> {userData?.email}
            </p>
            
            {/* ✨ NAYA CODE: Yahan Office Name Add Kiya Hai ✨ */}
            <p className="text-gray-400 font-bold flex items-center justify-center md:justify-start gap-2">
              <Building2 size={16} /> {userData?.officeName || "Organization Name"}
            </p>
            
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {infoCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
              <p className="text-xl font-black text-gray-900 italic tracking-tight">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone: Resignation Section */}
      <div className="bg-red-50 rounded-[40px] p-8 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 text-center md:text-left flex-col md:flex-row">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-red-900 italic tracking-tight">Danger Zone</h3>
            <p className="text-red-700/60 text-sm font-medium mt-1">Looking to leave the company? This action is formal.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsResignModalOpen(true)}
          className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-900 shadow-lg shadow-red-100 transition-all active:scale-95 w-full md:w-auto"
        >
          Submit Resignation
        </button>
      </div>

      {/* Resignation Modal */}
      {isResignModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsResignModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full transition-colors"><X size={20}/></button>
            
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <LogOut size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 italic uppercase tracking-tight">Resignation Form</h2>
                <p className="text-gray-400 font-medium text-sm mt-1">Please provide a valid reason for leaving.</p>
              </div>
            </div>

            <form onSubmit={handleResign} className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-4 tracking-widest italic">Reason for Resigning</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Tell us why you're leaving..."
                  className="w-full mt-2 p-6 bg-gray-50 border border-gray-200 rounded-[30px] font-bold outline-none focus:bg-white focus:border-red-400 transition-all resize-none shadow-inner text-gray-700 text-sm"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full bg-red-600 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-200 flex items-center justify-center gap-2 hover:bg-gray-900 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirm Submission"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}