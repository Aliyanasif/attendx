"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { 
  Lock, Mail, User, Building2, 
  ArrowRight, Loader2, Fingerprint 
} from "lucide-react";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [officeName, setOfficeName] = useState("");

  // 🚀 GOOGLE SIGN-IN LOGIC (Owner vs Staff Detection)
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const userEmail = res.user.email;

      // 1. Check karein ke kya ye email pehle se 'employees' collection mein mojood hai?
      const q = query(collection(db, "employees"), where("email", "==", userEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // CASE A: Email nahi mili = Ye naya OWNER hai
        const userDocRef = doc(db, "employees", res.user.uid);
        await setDoc(userDocRef, {
          uid: res.user.uid,
          name: res.user.displayName || "Owner",
          email: userEmail,
          officeName: "", 
          role: "Super Admin",
          createdAt: new Date().toISOString(),
          status: "active",
          profilePic: res.user.photoURL || "",
          setupComplete: false // 👈 Redirect trigger
        });
        notify("Welcome Owner! Please finalize your workspace setup. 🚀");
        router.push("/profile-first-setup");
      } else {
        // CASE B: Email mil gayi = Ye STAFF hai ya Purana Owner hai
        const existingUser = querySnapshot.docs[0].data();
        
        // Agar Owner hai lekin setup pehle kabhi pura nahi kiya tha
        if (existingUser.role === "Super Admin" && existingUser.setupComplete === false) {
          router.push("/profile-first-setup");
        } else {
          // Staff ya Verified Owner seedha dashboard par
          notify(`Welcome back, ${existingUser.name}! 👋`);
          router.push("/");
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        notify("Google Sign-In failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✉️ EMAIL/PASSWORD AUTH WITH CUSTOM ERROR HANDLING
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(res.user);
        await setDoc(doc(db, "employees", res.user.uid), {
          uid: res.user.uid,
          name: name,
          officeName: officeName,
          email: email,
          role: "Super Admin", 
          createdAt: new Date().toISOString(),
          status: "active",
          setupComplete: true // Manual signup mein office name pehle hi mil jata hai
        });
        await signOut(auth);
        notify("Account created! 🚀 Please verify your email to login.");
        setIsRegistering(false); 
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        if (!res.user.emailVerified) {
          await signOut(auth); 
          notify("Please verify your email address first! 🛑");
          return;
        }
        notify("Logged in successfully! 👋");
        router.push("/");
      }
    } catch (error: any) {
      // 🛠️ Custom Error Messages (Firebase defaults ko hide kar diya)
      const errorCode = error.code;
      if (errorCode === "auth/wrong-password" || errorCode === "auth/user-not-found" || errorCode === "auth/invalid-credential") {
        notify("Invalid Email or Password. Please try again! ❌");
      } else if (errorCode === "auth/too-many-requests") {
        notify("Too many failed attempts. Try again later! ⏳");
      } else {
        notify("Authentication failed. Check your connection.");
      }
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[28px] shadow-2xl shadow-blue-200 mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
            <Fingerprint size={40} className="text-white" />
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
            Attend<span className="text-blue-600">X</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">
            Next-Gen Workforce Portal
          </p>
        </div>

        <div className="bg-white rounded-[45px] shadow-[0_20px_70px_-15px_rgba(0,0,0,0.05)] border border-gray-50 p-8 md:p-10 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2">
              {isRegistering ? "Create Workspace" : "Welcome Back"}
            </h2>
            <p className="text-gray-500 mb-6 font-medium italic text-sm">
              {isRegistering ? "Setup your master office account." : "Login to manage your team."}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <>
                  <div className="group space-y-1">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                      <User size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                      <input required placeholder="Your Full Name" className="bg-transparent outline-none w-full font-bold text-sm" 
                        value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="group space-y-1">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                      <Building2 size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                      <input required placeholder="Office Name" className="bg-transparent outline-none w-full font-bold text-sm" 
                        value={officeName} onChange={(e) => setOfficeName(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="group space-y-1">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Mail size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                  <input required type="email" placeholder="Email Address" className="bg-transparent outline-none w-full font-bold text-sm" 
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="group space-y-1">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                  <Lock size={20} className="text-gray-400 group-focus-within:text-blue-600" />
                  <input required type="password" placeholder="Secure Password" className="bg-transparent outline-none w-full font-bold text-sm" 
                    onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              
              <button disabled={loading} type="submit" className="w-full bg-gray-900 text-white py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    {isRegistering ? "Launch Workspace" : "Access Account"} 
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400 font-bold uppercase text-[10px] tracking-widest italic">Or continue with</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={loading} 
              className="w-full bg-[#24292F] hover:bg-[#24292f]/90 text-white py-3.5 rounded-full font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 border border-white/10 mt-2 active:scale-95"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="tracking-tight italic font-black uppercase text-[11px]">Continue with Google</span>
            </button>

            <div className="mt-8 pt-6 border-t border-gray-50 text-center">
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[11px] font-bold text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {isRegistering ? "Already have an account?" : "Need a new office workspace?"}
                <span className="text-blue-600 underline font-black uppercase italic tracking-widest">
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