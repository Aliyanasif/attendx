"use client";

import { useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { X, User, Mail, Lock, Clock, Banknote, Briefcase, ShieldCheck, Loader2 } from "lucide-react";

export default function AddEmployeeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    designation: "",
    role: "Staff",
    salary: "",
    dutyHours: "9",
    shiftStart: "09:00",
    shiftEnd: "18:00",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create Login Account in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Save Full Profile in Firestore
      await addDoc(collection(db, "employees"), {
        uid: uid,
        name: formData.name,
        email: formData.email,
        designation: formData.designation,
        role: formData.role, // "Admin" or "Staff"
        salary: Number(formData.salary),
        dutyHours: Number(formData.dutyHours),
        shiftStart: formData.shiftStart,
        shiftEnd: formData.shiftEnd,
        status: "Active",
        createdAt: serverTimestamp(),
      });

      alert("Employee Registered Successfully! Login details are now active.");
      onClose();
      window.location.reload(); // Refresh to see new data
    } catch (error: any) {
      console.error("Error:", error);
      alert("Registration Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Add New Employee</h2>
            <p className="text-gray-400 font-medium text-sm mt-1">Create login credentials and set shift timings.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Name & Designation */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Basic Info</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 ring-blue-100 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required placeholder="Designation (e.g. Manager)" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 ring-blue-100 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>
            </div>

            {/* Login Credentials */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Login Details</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="email" placeholder="Email Address" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 ring-blue-100 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="password" placeholder="Password" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 ring-blue-100 outline-none transition-all"
                  onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            {/* Role & Salary */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Permissions & Pay</label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none appearance-none"
                    onChange={(e) => setFormData({...formData, role: e.target.value})}>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <input required type="number" placeholder="Duty Hrs" className="w-24 p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none"
                  onChange={(e) => setFormData({...formData, dutyHours: e.target.value})} />
              </div>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="number" placeholder="Monthly Salary (Rs.)" className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 ring-blue-100"
                  onChange={(e) => setFormData({...formData, salary: e.target.value})} />
              </div>
            </div>

            {/* Shift Timings */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Shift Timings</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">Start Time</span>
                  <input required type="time" defaultValue="09:00" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none mt-1"
                    onChange={(e) => setFormData({...formData, shiftStart: e.target.value})} />
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-gray-400 ml-2 uppercase">End Time</span>
                  <input required type="time" defaultValue="18:00" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none mt-1"
                    onChange={(e) => setFormData({...formData, shiftEnd: e.target.value})} />
                </div>
              </div>
            </div>

          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                <span>Registering Account...</span>
              </>
            ) : (
              <span>Add Employee to AttendX</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}