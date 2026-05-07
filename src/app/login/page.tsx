"use client";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false); // Toggle for Boss
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        // --- Boss (Super Admin) Registration ---
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "employees", res.user.uid), {
          uid: res.user.uid,
          name: name,
          email: email,
          role: "Super Admin", // Automatically granted
          createdAt: new Date().toISOString()
        });
        notify("Super Admin Account Created!");
      } else {
        // --- Regular Login ---
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: any) {
      notify(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl w-full max-w-md border border-gray-100">
        <h2 className="text-3xl font-black text-gray-900 mb-2">
          {isRegistering ? "Setup Super Admin" : "Welcome Back"}
        </h2>
        <p className="text-gray-500 mb-8 font-medium">
          {isRegistering ? "Create the master account for AttendX" : "Login to manage your workspace"}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <input required placeholder="Your Name" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100" 
              onChange={(e) => setName(e.target.value)} />
          )}
          <input required type="email" placeholder="Email" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100" 
            onChange={(e) => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100" 
            onChange={(e) => setPassword(e.target.value)} />
          
          <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 active:scale-95 transition-all">
            {isRegistering ? "Create Boss Account" : "Sign In"}
          </button>
        </form>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-6 text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors"
        >
          {isRegistering ? "Already have an account? Login" : "Are you the Boss? Create Super Admin Account"}
        </button>
      </div>
    </div>
  );
}