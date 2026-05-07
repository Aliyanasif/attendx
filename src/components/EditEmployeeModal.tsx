"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { X, User, Briefcase, ShieldCheck, Banknote, Clock, Loader2 } from "lucide-react";

export default function EditEmployeeModal({ isOpen, onClose, employee }: { isOpen: boolean, onClose: () => void, employee: any }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  // Jab bhi employee select ho, form data update karo
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        designation: employee.designation || "",
        role: employee.role || "Staff",
        salary: employee.salary || "",
        dutyHours: employee.dutyHours || "9",
        shiftStart: employee.shiftStart || "09:00",
        shiftEnd: employee.shiftEnd || "18:00",
      });
    }
  }, [employee]);

  if (!isOpen || !formData) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const empRef = doc(db, "employees", employee.id);
      await updateDoc(empRef, {
        ...formData,
        salary: Number(formData.salary),
        dutyHours: Number(formData.dutyHours),
      });
      alert("Employee Details Updated!");
      onClose();
      window.location.reload();
    } catch (error: any) {
      alert("Update Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900">Edit Employee</h2>
            <p className="text-gray-400 font-medium text-sm">Update profile, role, or shift timings.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleUpdate} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required value={formData.name} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100"
                  onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required value={formData.designation} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100"
                  onChange={(e) => setFormData({...formData, designation: e.target.value})} />
              </div>
            </div>

            {/* Role & Salary */}
            <div className="space-y-4">
              <select value={formData.role} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100"
                onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input required type="number" value={formData.salary} className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100"
                  onChange={(e) => setFormData({...formData, salary: e.target.value})} />
              </div>
            </div>

            {/* Shift Timings */}
            <div className="flex gap-4 col-span-full">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Shift Start</label>
                <input required type="time" value={formData.shiftStart} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-1"
                  onChange={(e) => setFormData({...formData, shiftStart: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Shift End</label>
                <input required type="time" value={formData.shiftEnd} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-1"
                  onChange={(e) => setFormData({...formData, shiftEnd: e.target.value})} />
              </div>
            </div>
          </div>

          <button disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}