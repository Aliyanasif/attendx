"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isRendered, setIsRendered] = useState(true);

  useEffect(() => {
    // 2.5 seconds ke baad fade out shuru hoga
    const fadeTimer = setTimeout(() => setIsVisible(false), 2500); 
    // 3 seconds ke baad component DOM se remove ho jayega
    const removeTimer = setTimeout(() => setIsRendered(false), 3000); 

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#F8FAFC] transition-opacity duration-500 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Top spacing */}
      <div className="flex-1"></div>

      {/* Center Logo Section */}
      <div className="flex flex-col items-center justify-center animate-in zoom-in duration-700">
        <div className="w-24 h-24 bg-blue-600 rounded-[35px] flex items-center justify-center text-white shadow-2xl shadow-blue-200 mb-6 rotate-3">
          <Fingerprint size={50} />
        </div>
        <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-gray-900">
          Attend<span className="text-blue-600">X</span>
        </h1>
      </div>

      {/* Bottom Company Branding (Meta Style) */}
      <div className="flex-1 flex flex-col justify-end pb-12 animate-in slide-in-from-bottom-5 duration-700">
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em] text-center mb-1">
          Created by
        </p>
        {/* Yahan aapki agency ka naam Pixel Craft laga diya hai */}
        <h2 className="text-blue-600 font-black uppercase text-lg tracking-[0.2em] italic">
          Aliyan Asif
        </h2>
      </div>
    </div>
  );
}