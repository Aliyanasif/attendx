"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { X } from "lucide-react";

export default function AddEmployeeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Firebase mein data bhej rahay hain
      await addDoc(collection(db, "employees"), {
        name,
        role,
        salary: `Rs. ${salary}`,
        status: "Active",
        joiningDate: new Date().toISOString(),
      });
      alert("Employee Added Successfully! 🔥");
      setName(""); setRole(""); setSalary("");
      onClose(); // Form band kar do
    } catch (error) {
      console.error("Error adding document: ", error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Employee</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
            <input 
              required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1.5 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Hamza Ahmed"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 ml-1">Job Role</label>
            <input 
              required value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full mt-1.5 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. UI/UX Designer"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 ml-1">Monthly Salary (Rs.)</label>
            <input 
              required type="number" value={salary} onChange={(e) => setSalary(e.target.value)}
              className="w-full mt-1.5 p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. 85000"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-gray-400"
          >
            {loading ? "Saving..." : "Add Employee"}
          </button>
        </form>
      </div>
    </div>
  );
}