"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { 
  Lock, Mail, User, Building2, ShieldCheck, 
  ArrowRight, Sparkles, Loader2, Fingerprint 
} from "lucide-react";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        // --- Super Admin Registration ---
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "employees", res.user.uid), {
          uid: res.user.uid,
          name: name,
          officeName: officeName,
          email: email,
          role: "Super Admin", // ✅ Fixed: Hamesha Super Admin hi banega
          createdAt: new Date().toISOString(),
          status: "active"
        });
        notify(`Welcome ${name}! Your Super Admin account is ready. 🚀`);
      } else {
        // --- Login ---
        await signInWithEmailAndPassword(auth, email, password);
        notify("Logged in successfully! 👋");
      }
      router.push("/");
    } catch (err: any) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans text-gray-900">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[480px] animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[28px] shadow-2xl shadow-blue-200 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Fingerprint size={40} className="text-white" />
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
            Attend<span className="text-blue-600">X</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
            {isRegistering ? `${name || 'User'} Registration` : "Next-Gen Workforce Portal"}
          </p>
        </div>

        <div className="bg-white rounded-[45px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.05)] border border-gray-50 p-10 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2">
              {isRegistering ? `Create ${name || 'User'}'s Workspace` : "Welcome Back"}
            </h2>
            <p className="text-gray-500 mb-8 font-medium italic text-sm">
              {isRegistering ? "Setup your master office account." : "Login to manage your team."}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <div className="group space-y-1">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all">
                      <User size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                      <input required placeholder="Your Full Name" className="bg-transparent outline-none w-full font-bold text-sm" 
                        value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>

                  <div className="group space-y-1">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all">
                      <Building2 size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                      <input required placeholder="Office / Agency Name" className="bg-transparent outline-none w-full font-bold text-sm" 
                        value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="group space-y-1">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all">
                  <Mail size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                  <input required type="email" placeholder="Email Address" className="bg-transparent outline-none w-full font-bold text-sm" 
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="group space-y-1">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all">
                  <Lock size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                  <input required type="password" placeholder="Secure Password" className="bg-transparent outline-none w-full font-bold text-sm" 
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              
              <button disabled={loading} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-6">
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    {isRegistering ? `Launch ${name || 'User'}'s Workspace` : "Access Account"} 
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-50 text-center">
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isRegistering ? "Already have an account?" : "Need a new office workspace?"}
                <span className="text-blue-600 underline font-black uppercase italic">
                  {isRegistering ? "Sign In" : "Register Now"}
                </span>
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
        </div>
      </div>
    </div>
  );
}