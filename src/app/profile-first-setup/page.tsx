"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { Building2, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function ProfileSetup() {
  const { userData, user } = useAuth();
  const [officeName, setOfficeName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const userDocRef = doc(db, "employees", user.uid);
      await updateDoc(doc(db, "employees", user.uid), {
        officeName: officeName,
        setupComplete: true // 👈 Ye add karein
      });
      
      notify("Workspace setup complete! 🚀");
      router.push("/");
    } catch (error: any) {
      notify("Setup Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-[450px] animate-in fade-in zoom-in duration-500">
        <div className="bg-white rounded-[40px] shadow-2xl p-10 border border-gray-50 relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
              <Sparkles className="text-white" size={30} />
            </div>
            
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
              Final <span className="text-blue-600">Step</span>
            </h2>
            <p className="text-gray-500 font-medium italic text-sm mb-8">
            Please provide your organization or agency name to finalize the setup and launch your workspace.
            </p>

            <form onSubmit={handleSetup} className="space-y-6">
              <div className="group space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Office Name</label>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Building2 size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                  <input 
                    required 
                    // placeholder="e.g. Pixel Craft Agency" 
                    className="bg-transparent outline-none w-full font-bold text-sm" 
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                  />
                </div>
              </div>

              <button 
                disabled={loading || !officeName} 
                type="submit" 
                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>Complete Setup <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}