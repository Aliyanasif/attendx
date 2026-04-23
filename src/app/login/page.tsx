"use client";
import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); // Login ke baad dashboard bhej do
    } catch (err: any) {
      setError("Invalid email or password. Try again!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-200 border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-black text-2xl">A</div>
          <h2 className="text-3xl font-black text-gray-900">AttendX Login</h2>
          <p className="text-gray-400 mt-2 font-medium">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p className="text-red-500 text-sm text-center font-bold bg-red-50 py-2 rounded-xl">{error}</p>}
          
          <div className="space-y-4">
            <input
              type="email" placeholder="Email Address" required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password" placeholder="Password" required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}