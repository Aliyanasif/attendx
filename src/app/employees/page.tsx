"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext"; // Auth context for role check
import { 
  Users, UserPlus, Search, Edit2, Trash2, X, Loader2, Shield, Clock, 
  CreditCard, User, Timer, Lock, Briefcase, ChevronDown, Check,
  LayoutGrid, List, Sparkles, AlertCircle
} from "lucide-react";
import { notify } from "@/lib/notify";

const DESIGNATIONS = [
  "Chief Executive Officer (CEO)", "General Manager", "Operations Manager", "HR Manager", 
  "Project Manager", "Senior Software Engineer", "Frontend Developer", "Backend Developer", 
  "UI/UX Designer", "Senior Graphic Designer", "Motion Graphics Artist", "Video Editor", 
  "Digital Marketing Head", "Social Media Manager", "Content Strategist", "SEO Specialist", 
  "Sales Executive", "Accountant", "Office Assistant", "IT Support Specialist"
];

export default function ManageStaffPage() {
  const { userData, loading: authLoading } = useAuth(); // Destructuring auth data[cite: 2]
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialForm = {
    name: "",
    designation: DESIGNATIONS[0],
    role: "Staff",
    email: "",
    password: "",
    salary: "",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    dutyHours: "9"
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    // Sync data from Firestore[cite: 2]
    const unsubscribe = onSnapshot(collection(db, "employees"), (snap) => {
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 🛡️ 1. ROLE-BASED ACCESS CONTROL[cite: 2]
  // Agar auth loading khatam ho gayi hai aur user Manager/Admin nahi hai
  if (!authLoading && userData?.role === "Staff") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-xl shadow-red-100">
          <Lock size={48} />
        </div>
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900">Access Denied</h2>
        <p className="text-gray-500 font-bold mt-4 max-w-sm italic">Bhai, ye area sirf Management ke liye reserved hai. Aapka access restricted hai.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 🛡️ 2. ENSURING ALL FIELDS SYNC TO DATABASE[cite: 2]
      const finalData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        designation: formData.designation,
        role: formData.role,
        salary: formData.salary,
        shiftStart: formData.shiftStart,
        shiftEnd: formData.shiftEnd,
        dutyHours: formData.dutyHours,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), finalData);
      } else {
        await addDoc(collection(db, "employees"), {
          ...finalData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) { 
      console.error("Database Sync Error:", err);
      notify("Error: Database se connection mein masla hai.");
    }
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleEdit = (emp: any) => {
    setFormData({ ...emp });
    setEditingId(emp.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this employee permanently?")) {
      await deleteDoc(doc(db, "employees", id));
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4">
      
      {/* 1. Header Section[cite: 2] */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic uppercase leading-none">
            Staff <span className="text-blue-600">Management</span>
          </h1>
          <p className="text-gray-500 font-medium italic mt-2 tracking-tight">Enterprise control over team roles and credentials.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-gray-900 text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 active:scale-95"
        >
          <UserPlus size={18} /> Add New Staff
        </button>
      </div>

      {/* 2. Filter & View Switcher[cite: 2] */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-4 rounded-[32px] border border-gray-50 shadow-sm flex-1 w-full">
          <div className="bg-gray-50 flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100 group focus-within:border-blue-100 transition-all">
            <Search className="text-gray-400 group-focus-within:text-blue-600" size={18} />
            <input 
              type="text" 
              placeholder="Search staff by name or position..." 
              className="bg-transparent border-none outline-none w-full font-bold text-sm text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-2 rounded-[24px] border border-gray-50 shadow-sm flex gap-1">
          <button 
            onClick={() => setViewMode("grid")}
            className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode("list")}
            className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* 3. Main Content Display[cite: 2] */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-100">{emp.name?.[0]}</div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(emp)} className="p-2.5 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(emp.id)} className="p-2.5 hover:bg-red-50 text-red-500 rounded-xl transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic leading-none truncate">{emp.name}</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 mb-6">{emp.designation}</p>
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50 font-black text-gray-900 text-[10px] uppercase">
                <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1">
                  <span className="text-gray-400 text-[8px] tracking-widest">System Role</span> {emp.role}
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1">
                  <span className="text-gray-400 text-[8px] tracking-widest">Base Salary</span> Rs {emp.salary}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-gray-50 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest">
                <th className="p-6">Employee Info</th>
                <th className="p-6">Position</th>
                <th className="p-6">Salary</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold text-sm">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-all group">
                  <td className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-blue-600 font-black italic group-hover:bg-blue-600 group-hover:text-white transition-colors">{emp.name?.[0]}</div>
                    <div className="flex flex-col">
                      <span className="uppercase italic text-gray-900">{emp.name}</span>
                      <span className="text-[10px] font-medium text-gray-400 lowercase">{emp.email}</span>
                    </div>
                  </td>
                  <td className="p-6 text-xs text-blue-600 uppercase font-black">{emp.designation}</td>
                  <td className="p-6 text-xs text-gray-900">Rs {emp.salary}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(emp)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-all"><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. UNIFIED MODAL (Add/Edit)[cite: 2] */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[50px] shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="z-10">
                <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{editingId ? "Update" : "Register"} Profile</h3>
                <p className="text-blue-100 text-[10px] font-bold uppercase mt-3 tracking-[0.2em]">Full Workforce Credentials</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="z-10 p-3 hover:bg-white/20 rounded-full transition-all"><X size={28}/></button>
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <User className="text-blue-600" size={20}/>
                  <input required className="bg-transparent outline-none w-full font-bold text-gray-900" placeholder="Aliyan Asif" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Designation</label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`group bg-gray-50 p-5 rounded-[24px] border flex items-center justify-between cursor-pointer transition-all shadow-sm ${isDropdownOpen ? 'border-blue-600 bg-white ring-4 ring-blue-50' : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <Briefcase className="text-blue-600" size={20}/>
                    <span className="font-bold text-gray-900">{formData.designation}</span>
                  </div>
                  <ChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                </div>
                {isDropdownOpen && (
                  <div className="absolute z-[110] left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[30px] shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar py-2">
                      {DESIGNATIONS.map((d) => (
                        <div 
                          key={d}
                          onClick={() => { setFormData({...formData, designation: d}); setIsDropdownOpen(false); }}
                          className={`px-8 py-4 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 cursor-pointer ${formData.designation === d ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Work Email</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Shield className="text-blue-600" size={20}/>
                  <input required type="email" className="bg-transparent outline-none w-full font-bold text-gray-900" placeholder="staff@attendx.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Login Password</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Lock className="text-blue-600" size={20}/>
                  <input required type="text" className="bg-transparent outline-none w-full font-bold text-gray-900" placeholder="Set Secure Access" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Organization Role</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Users className="text-blue-600" size={20}/>
                  <select className="bg-transparent outline-none w-full font-bold text-gray-900 appearance-none cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="Staff">Staff Member</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Monthly Salary (Rs)</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <CreditCard className="text-blue-600" size={20}/>
                  <input required type="number" className="bg-transparent outline-none w-full font-bold text-gray-900" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Shift Timings</label>
                <div className="flex gap-4">
                  <div className="group flex-1 bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-2 focus-within:border-blue-600 focus-within:bg-white transition-all">
                    <Clock size={18} className="text-blue-600" />
                    <input type="time" className="bg-transparent outline-none font-bold text-gray-900 w-full" value={formData.shiftStart} onChange={e => setFormData({...formData, shiftStart: e.target.value})} />
                  </div>
                  <div className="group flex-1 bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-2 focus-within:border-blue-600 focus-within:bg-white transition-all">
                    <Clock size={18} className="text-blue-600" />
                    <input type="time" className="bg-transparent outline-none font-bold text-gray-900 w-full" value={formData.shiftEnd} onChange={e => setFormData({...formData, shiftEnd: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Daily Duty Hours</label>
                <div className="group bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Timer className="text-blue-600" size={20}/>
                  <input required type="number" className="bg-transparent outline-none w-full font-bold text-gray-900" value={formData.dutyHours} onChange={e => setFormData({...formData, dutyHours: e.target.value})} />
                </div>
              </div>

              <div className="md:col-span-2 flex gap-4 pt-10 mt-6 border-t border-gray-50">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black uppercase text-xs tracking-widest transition-all">Discard</button>
                <button type="submit" className="flex-[2] py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {editingId ? "Save All Changes" : "Confirm Registration"} <Sparkles size={16}/>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}