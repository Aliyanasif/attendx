"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { 
  User, Mail, Phone, MapPin, Camera, Save, 
  Loader2, Globe, Github, Linkedin, Notebook 
} from "lucide-react";
import { notify } from "@/lib/notify";

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    linkedin: "",
    website: "",
    profilePic: ""
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        address: userData.address || "",
        bio: userData.bio || "",
        linkedin: userData.linkedin || "",
        website: userData.website || "",
        profilePic: userData.profilePic || ""
      });
    }
  }, [userData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "employees", user.uid), {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      notify("Profile updated successfully! ✨");
    } catch (err: any) {
      notify("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-10 text-center md:text-left pt-6">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
          Profile <span className="text-blue-600">Setup</span>
        </h1>
        <p className="text-gray-500 font-bold italic mt-2 uppercase text-[10px] tracking-widest">Personalize your AttendX Identity</p>
      </div>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center relative overflow-hidden group">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="w-full h-full bg-blue-50 rounded-[35px] flex items-center justify-center text-blue-600 border-4 border-white shadow-xl overflow-hidden">
                {formData.profilePic ? (
                  <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={50} strokeWidth={1.5} />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-gray-900 text-white p-3 rounded-2xl cursor-pointer hover:bg-blue-600 transition-all shadow-lg active:scale-90">
                <Camera size={18} />
                <input type="file" className="hidden" />
              </label>
            </div>
            <h3 className="text-xl font-black italic uppercase text-gray-900 tracking-tight">{formData.name}</h3>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 inline-block px-4 py-1 rounded-full mt-2">
              {userData?.role || "Team Member"}
            </p>
          </div>

          <div className="bg-gray-900 p-8 rounded-[40px] text-white relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Office Workspace</p>
              <h4 className="text-lg font-black italic uppercase leading-none">{userData?.officeName || "Main HQ"}</h4>
            </div>
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Right Column: Detailed Fields */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-10 rounded-[50px] border border-gray-50 shadow-sm space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name (Pre-filled) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:bg-white focus-within:border-blue-600 transition-all">
                  <User size={18} className="text-blue-600" />
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-transparent outline-none w-full font-bold text-sm text-gray-900" />
                </div>
              </div>

              {/* Email (Disabled for Security) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Read Only)</label>
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 opacity-60">
                  <Mail size={18} className="text-gray-400" />
                  <input disabled value={formData.email} className="bg-transparent outline-none w-full font-bold text-sm text-gray-400" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:bg-white focus-within:border-blue-600 transition-all">
                  <Phone size={18} className="text-blue-600" />
                  <input placeholder="+92 300 1234567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-transparent outline-none w-full font-bold text-sm text-gray-900" />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Portfolio/Website</label>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:bg-white focus-within:border-blue-600 transition-all">
                  <Globe size={18} className="text-blue-600" />
                  <input placeholder="https://yourwork.com" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="bg-transparent outline-none w-full font-bold text-sm text-gray-900" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Home Address</label>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:bg-white focus-within:border-blue-600 transition-all">
                <MapPin size={18} className="text-blue-600" />
                <input placeholder="Street, Area, City, Pakistan" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-transparent outline-none w-full font-bold text-sm text-gray-900" />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Professional Bio</label>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-4 focus-within:bg-white focus-within:border-blue-600 transition-all">
                <Notebook size={18} className="text-blue-600 mt-1" />
                <textarea rows={3} placeholder="Tell us about your role and expertise..." value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="bg-transparent outline-none w-full font-bold text-sm text-gray-900 resize-none" />
              </div>
            </div>

            <button disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save My Profile</>}
            </button>

          </div>
        </div>
      </form>
    </div>
  );
}