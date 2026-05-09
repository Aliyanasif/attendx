"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, updateDoc, doc, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldCheck, UserX, Search, Crown, Building2, Mail, User } from "lucide-react";
import { notify } from "@/lib/notify";

export default function OwnerControlPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🛡️ SECURITY: Sirf aapka specific email isay access kar sakay
  const OWNER_EMAIL = "aliyanasif503@gmail.com"; // 👈 Apna email yahan confirm karein

  useEffect(() => {
    if (user?.email !== OWNER_EMAIL) return;

    // Sirf un users ko fetch karo jo "Super Admin" hain (yani office owners)
    const q = query(collection(db, "employees"), where("role", "==", "Super Admin"));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const togglePremium = async (adminId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "employees", adminId), {
        isPremium: !currentStatus // Status flip kar dega
      });
      notify(currentStatus ? "Account downgraded to Free" : "Account upgraded to Premium! 🚀");
    } catch (err) {
      notify("Action failed!");
    }
  };

  if (user?.email !== OWNER_EMAIL) {
    return <div className="p-20 text-center font-black uppercase italic text-red-500">Bhai, ye page sirf Owner ke liye hai! 🚫</div>;
  }

  const filteredAdmins = admins.filter(a => 
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.officeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 p-6 animate-in fade-in duration-700">
      <div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
          Owner <span className="text-blue-600">Command Center</span>
        </h1>
        <p className="text-gray-400 font-bold mt-2 uppercase text-[10px] tracking-widest italic">Pixel Craft Platform Control</p>
      </div>

      {/* Search Admins */}
      <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="bg-gray-50 flex items-center gap-3 px-6 py-3 rounded-2xl border border-gray-100">
          <Search className="text-gray-400" size={18} />
          <input 
            placeholder="Search Office Owners..." 
            className="bg-transparent outline-none w-full font-bold text-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAdmins.map((admin) => (
            <div key={admin.id} className="bg-white p-8 rounded-[40px] border border-gray-50 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-lg">
                  {admin.officeName?.[0] || "O"}
                </div>
                {admin.isPremium ? (
                  <div className="bg-yellow-50 text-yellow-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-yellow-100">
                    <Crown size={14} /> Premium Client
                  </div>
                ) : (
                  <div className="bg-gray-50 text-gray-400 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 border border-gray-100">
                    Free Tier
                  </div>
                )}
              </div>

              <h3 className="text-xl font-black uppercase italic leading-none">{admin.officeName}</h3>
              <p className="text-gray-400 font-bold text-[10px] mt-2 uppercase tracking-widest italic border-b border-gray-50 pb-4 mb-4 flex items-center gap-2">
                <User size={12} className="text-blue-600" /> Owner: {admin.name}
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                  <Mail size={16} className="text-blue-600" /> {admin.email}
                </div>
              </div>

              {/* Toggle Button */}
              <button 
                onClick={() => togglePremium(admin.id, admin.isPremium)}
                className={`w-full py-4 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  admin.isPremium 
                  ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" 
                  : "bg-blue-600 text-white hover:bg-gray-900 shadow-xl shadow-blue-100"
                }`}
              >
                {admin.isPremium ? <UserX size={18} /> : <ShieldCheck size={18} />}
                {admin.isPremium ? "Deactivate Premium" : "Activate Premium"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}