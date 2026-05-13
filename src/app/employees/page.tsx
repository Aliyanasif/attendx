"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, query, where, setDoc, getDocs 
} from "firebase/firestore"; 
import { useAuth } from "@/context/AuthContext"; 
import { 
  Users, UserPlus, Search, Edit2, Trash2, X, Loader2, Shield, Clock, 
  CreditCard, User, Timer, Lock, Briefcase, ChevronDown, Check,
  LayoutGrid, List, Sparkles, AlertCircle, Mail, Key, Phone, MapPin, Globe, Link, Crown
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
  const { userData, user, loading: authLoading } = useAuth(); 
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Modals & Selection State
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false); 
  const [isConfirmOpen, setIsConfirmOpen] = useState(false); 
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); 
  const [selectedStaff, setSelectedStaff] = useState<any>(null); 
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initialForm = {
    name: "", designation: DESIGNATIONS[0], role: "Staff", email: "", 
    password: "", salary: "", shiftStart: "09:00", shiftEnd: "18:00", dutyHours: "9"
  };

  const [formData, setFormData] = useState(initialForm);

  const isTrialValid = () => {
    if (userData?.isPremium === false) return false;
    if (!userData?.createdAt) return false;
    const trialDays = 14;
    const createdDate = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    const expiryDate = new Date(createdDate.getTime() + trialDays * 24 * 60 * 60 * 1000);
    return new Date() < expiryDate;
  };

  const hasAccess = userData?.isPremium || isTrialValid();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "employees"), where("adminUid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
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
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "employees", editingId), { ...formData, updatedAt: serverTimestamp() });
        notify("employee updated successfully! 📝");
      } else {
        const { initializeApp, getApps } = await import("firebase/app");
        const { getAuth: getSecondaryAuth, createUserWithEmailAndPassword: createInSecondary } = await import("firebase/auth");
        const firebaseConfig = { apiKey: "AIzaSyBEsvkvSZRRXTkj4uj_G2sMJw34Kr98ZHk", authDomain: "attendx-f70b9.firebaseapp.com", projectId: "attendx-f70b9" };
        const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getSecondaryAuth(secondaryApp);
        const userCredential = await createInSecondary(secondaryAuth, formData.email, formData.password);
        const newUserId = userCredential.user.uid;
        
        await setDoc(doc(db, "employees", newUserId), { 
          ...formData, 
          uid: newUserId, 
          adminUid: user.uid, 
          officeName: userData?.officeName || "Organization Name", 
          createdAt: serverTimestamp() 
        });
        
        notify("Employee Registered!");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) { notify("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => { setFormData(initialForm); setEditingId(null); };
  
  const handleEdit = (emp: any) => { 
    setFormData({ ...emp }); 
    setEditingId(emp.id); 
    setIsModalOpen(true); 
  };

  const openProfile = (emp: any) => {
    setSelectedStaff(emp);
    setIsProfileModalOpen(true);
  };

  const triggerDelete = (id: string) => { setDeleteId(id); setIsConfirmOpen(true); };

  const confirmDelete = async () => { 
    if (deleteId) { 
      try {
        const empToDelete = employees.find(e => e.id === deleteId);
        
        // 🚀 1. CALL SECURE API TO DELETE FROM FIREBASE AUTH
        if (empToDelete?.uid) {
          await fetch("/api/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: empToDelete.uid })
          });
        }
        
        // 🚀 2. DELETE FROM FIRESTORE DATABASE
        await deleteDoc(doc(db, "employees", deleteId)); 

        if (empToDelete) {
          const attQ = query(collection(db, "attendance"), where("employeeName", "==", empToDelete.name));
          const attSnap = await getDocs(attQ);
          attSnap.forEach((d) => deleteDoc(d.ref));

          const salQ = query(collection(db, "salary_history"), where("employeeName", "==", empToDelete.name));
          const salSnap = await getDocs(salQ);
          salSnap.forEach((d) => deleteDoc(d.ref));
        }

        notify("Account termination complete. All related data has been erased."); 
        setIsConfirmOpen(false); 
        setDeleteId(null);
      } catch (err: any) {
        notify("Delete failed: " + err.message);
      }
    } 
  };

  const filteredEmployees = employees.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!authLoading && userData?.role === "Staff") return <div className="p-20 text-center font-black uppercase italic">Access Denied</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 px-4 mt-4 text-gray-900">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-none">Staff <span className="text-blue-600">Management</span></h1>
          <p className="text-gray-500 font-medium italic mt-2">Enterprise control over team roles and credentials.</p>
        </div>
        
        {/* ✨ PREMIUM LOGIC APPLIED HERE */}
        {hasAccess ? (
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="bg-gray-900 text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-3"
          >
            <UserPlus size={18} /> Add New Staff
          </button>
        ) : (
          <button 
            onClick={() => setIsPremiumModalOpen(true)} 
            className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-8 py-4 rounded-[24px] font-black uppercase text-xs hover:scale-105 transition-all shadow-xl shadow-yellow-500/30 active:scale-95 flex items-center gap-3"
          >
            <Crown size={18} /> Add New Staff
          </button>
        )}
      </div>

      {/* Search & Switcher */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-4 rounded-[32px] border border-gray-50 shadow-sm flex-1 w-full">
          <div className="bg-gray-50 flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100">
            <Search className="text-gray-400" size={18} />
            <input type="text" placeholder="Search staff..." className="bg-transparent border-none outline-none w-full font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="bg-white p-2 rounded-[24px] border border-gray-50 shadow-sm flex gap-1">
          <button onClick={() => setViewMode("grid")} className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><LayoutGrid size={20} /></button>
          <button onClick={() => setViewMode("list")} className={`p-3 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><List size={20} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => {
            const isComplete = emp.phone || emp.address; 
            return (
              <div key={emp.id} onClick={() => openProfile(emp)} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-blue-100">{emp.name?.[0]}</div>
                    {isComplete && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-lg shadow-lg border-2 border-white animate-pulse" title="Profile Complete">
                        <Sparkles size={12} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 z-20 relative">
                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(emp); }} className="p-2.5 bg-blue-50/50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all duration-300"><Edit2 size={16} /></button>
                    <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); triggerDelete(emp.id); }} className="p-2.5 bg-red-50/50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all duration-300"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic leading-none truncate">{emp.name}</h3>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-2 mb-6">{emp.designation}</p>
                  <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50 font-black text-[10px] uppercase">
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1"><span className="text-gray-400 text-[8px] italic text-blue-600 mb-1">Salary</span>PKR {emp.salary}</div>
                    <div className="bg-gray-50 p-4 rounded-2xl flex flex-col gap-1"><span className="text-gray-400 text-[8px] italic text-blue-600 mb-1">Hours</span>{emp.dutyHours}h</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-gray-50 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-900 text-white font-black text-[10px] uppercase tracking-[0.2em]">
                <th className="p-6 italic">Employee Info</th>
                <th className="p-6 italic">Designation</th>
                <th className="p-6 italic">Salary</th>
                <th className="p-6 italic">Timings</th>
                <th className="p-6 italic text-right px-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold text-sm">
              {filteredEmployees.map((emp) => {
                const isComplete = emp.phone || emp.address;
                return (
                  <tr key={emp.id} onClick={() => openProfile(emp)} className="hover:bg-blue-50/30 transition-all group cursor-pointer">
                    <td className="p-6 flex items-center gap-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-blue-600 font-black italic group-hover:bg-blue-600 group-hover:text-white transition-colors">{emp.name?.[0]}</div>
                        {isComplete && <Sparkles size={10} className="absolute -top-1 -right-1 text-blue-600" />}
                      </div>
                      <div className="flex flex-col"><span className="uppercase italic tracking-tighter">{emp.name}</span><span className="text-[10px] text-gray-400 font-medium">{emp.email}</span></div>
                    </td>
                    <td className="p-6 text-[10px] uppercase font-black text-blue-600 tracking-widest">{emp.designation}</td>
                    <td className="p-6 italic">PKR {emp.salary}</td>
                    <td className="p-6 text-xs font-black">{emp.shiftStart} - {emp.shiftEnd}</td>
                    <td className="p-6 text-right px-10">
                      <div className="flex justify-end gap-2 relative z-20">
                        <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); handleEdit(emp); }} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={16}/></button>
                        <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); triggerDelete(emp.id); }} className="p-2 hover:bg-red-100 text-red-500 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* 💎 STAFF PROFILE POP-UP (MODAL) */}
      {isProfileModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[60px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
              <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-6 right-6 bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md hover:bg-white/40 transition-all"><X size={20} /></button>
            </div>
            <div className="px-10 pb-12">
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 bg-white p-2 rounded-[45px] shadow-2xl">
                  <div className="w-full h-full bg-blue-50 rounded-[38px] flex items-center justify-center text-blue-600 overflow-hidden border-2 border-blue-100">
                    {selectedStaff.profilePic ? <img src={selectedStaff.profilePic} className="w-full h-full object-cover" /> : <User size={50} strokeWidth={1.5} />}
                  </div>
                </div>
                <div className="mt-4">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">{selectedStaff.name}</h2>
                  <p className="text-blue-600 font-black uppercase text-xs tracking-[0.3em] mt-2 italic flex items-center gap-2"><Shield size={14} /> {selectedStaff.designation}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} className="text-blue-600" /> Email Identity</p><p className="font-bold text-gray-900 truncate">{selectedStaff.email}</p></div>
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-blue-600" /> Direct Contact</p><p className="font-bold text-gray-900">{selectedStaff.phone || "Not Provided"}</p></div>
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-1 sm:col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-blue-600" /> Registered Address</p><p className="font-bold text-gray-900">{selectedStaff.address || "Address not provided yet."}</p></div>
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-1 sm:col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={12} className="text-blue-600" /> Professional Bio</p><p className="font-medium italic text-gray-600 text-sm">{selectedStaff.bio || "No bio updated by staff yet."}</p></div>
              </div>
              <div className="flex gap-4 mt-8">
                 {selectedStaff.linkedin && <a href={selectedStaff.linkedin} target="_blank" className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Link size={20} /></a>}
                 {selectedStaff.website && <a href={selectedStaff.website} target="_blank" className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-blue-600 transition-all"><Globe size={20} /></a>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md overflow-y-auto text-gray-900">
          <div className="bg-white w-full max-w-4xl rounded-[50px] shadow-2xl overflow-hidden my-8 animate-in zoom-in duration-300">
            <div className="bg-blue-600 p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="z-10"><h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{editingId ? "Update" : "Register"} Profile</h3><p className="text-blue-100 text-[10px] font-bold uppercase mt-3 tracking-[0.2em]">Full Workforce Credentials</p></div>
              <button onClick={() => setIsModalOpen(false)} className="z-10 p-3 hover:bg-white/20 rounded-full transition-all text-white"><X size={28}/></button>
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Full Name</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm"><User className="text-blue-600" size={20}/><input required className="bg-transparent outline-none w-full font-bold" placeholder="Alex" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div></div>
              <div className="space-y-2 relative" ref={dropdownRef}><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Designation</label><div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`bg-gray-50 p-5 rounded-[24px] border flex items-center justify-between cursor-pointer transition-all shadow-sm ${isDropdownOpen ? 'border-blue-600 bg-white' : 'border-gray-100'}`}><div className="flex items-center gap-4"><Briefcase className="text-blue-600" size={20}/><span className="font-bold">{formData.designation}</span></div><ChevronDown size={18} /></div>{isDropdownOpen && (<div className="absolute z-[110] left-0 right-0 mt-3 bg-white border border-gray-100 rounded-[30px] shadow-2xl overflow-hidden py-2 max-h-64 overflow-y-auto">{DESIGNATIONS.map((d) => (<div key={d} onClick={() => { setFormData({...formData, designation: d}); setIsDropdownOpen(false); }} className={`px-8 py-4 text-sm font-bold hover:bg-blue-50 hover:text-blue-600 cursor-pointer ${formData.designation === d ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}>{d}</div>))}</div>)}</div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Work Email</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white shadow-sm"><Mail className="text-blue-600" size={20}/><input required type="email" className="bg-transparent outline-none w-full font-bold" placeholder="staff@attendx.info" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Login Password</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white shadow-sm"><Lock className="text-blue-600" size={20}/><input required type="text" className="bg-transparent outline-none w-full font-bold" placeholder="Set Secure Access" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Organization Role</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white shadow-sm"><Users className="text-blue-600" size={20}/><select className="bg-transparent outline-none w-full font-bold appearance-none cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="Staff">Staff Member</option><option value="Manager">Manager</option><option value="Admin">System Admin</option></select></div></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Monthly Salary (PKR)</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white shadow-sm"><CreditCard className="text-blue-600" size={20}/><input required type="number" className="bg-transparent outline-none w-full font-bold" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} /></div></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Shift Timings</label><div className="flex gap-4"><div className="bg-gray-50 flex-1 p-5 rounded-[24px] border flex items-center gap-2"><Clock size={18} className="text-blue-600" /><input type="time" className="bg-transparent outline-none font-bold w-full" value={formData.shiftStart} onChange={e => setFormData({...formData, shiftStart: e.target.value})} /></div><div className="bg-gray-50 flex-1 p-5 rounded-[24px] border flex items-center gap-2"><Clock size={18} className="text-blue-600" /><input type="time" className="bg-transparent outline-none font-bold w-full" value={formData.shiftEnd} onChange={e => setFormData({...formData, shiftEnd: e.target.value})} /></div></div></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Daily Duty Hours</label><div className="bg-gray-50 p-5 rounded-[24px] border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white shadow-sm"><Timer className="text-blue-600" size={20}/><input required type="number" className="bg-transparent outline-none w-full font-bold" value={formData.dutyHours} onChange={e => setFormData({...formData, dutyHours: e.target.value})} /></div></div>
              <div className="md:col-span-2 flex gap-4 pt-10 mt-6 border-t border-gray-50"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-[28px] font-black uppercase text-xs tracking-widest">Discard</button><button type="submit" className="flex-[2] py-5 bg-blue-600 text-white rounded-[28px] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">{editingId ? "Save Changes" : "Confirm Registration"} <Sparkles size={16}/></button></div>
            </form>
          </div>
        </div>
      )}

      {/* INDEPENDENT CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border border-red-50 animate-in zoom-in duration-300">
            <div className="bg-red-500 p-8 text-white text-center relative overflow-hidden">
              <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md"><AlertCircle size={32} /></div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Confirm Delete</h3>
              <p className="text-red-100 text-[10px] font-bold uppercase mt-2 tracking-widest">This action is irreversible</p>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-gray-500 font-bold text-center italic text-sm leading-relaxed">Bhai, kya aap waqai is employee ka record hamesha ke liye delete karna chahte hain? Is se related baaki data bhi remove ho jayega.</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsConfirmOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button onClick={confirmDelete} className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200">Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}