"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("🚀 1. FIREBASE AUTH LOGIN SUCCESS:", firebaseUser.email);
        
        try {
          const q = query(collection(db, "employees"), where("email", "==", firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const dbData = querySnapshot.docs[0].data();
            console.log("✅ 2. FIRESTORE SE DATA MIL GAYA:", dbData);
            setUserData(dbData);
          } else {
            console.warn("⚠️ 3. FIRESTORE MEIN YE EMAIL NAHI MILA:", firebaseUser.email);
            
            // 🔒 SECURITY FIX: Sirf aapke email ko Super Admin banayega
            if (firebaseUser.email === "aliyanasif754@gmail.com") { 
              setUserData({ role: "Super Admin", name: "Aliyan Asif" });
            } else {
              setUserData({ role: "Staff", name: "Employee", email: firebaseUser.email });
            }
          }
        } catch (error) {
          console.error("❌ FIRESTORE ERROR (Permission ya Rules masla):", error);
          
          // Agar database error de, tab bhi security barkarar rahay
          if (firebaseUser.email === "aliyanasif754@gmail.com") {
            setUserData({ role: "Super Admin", name: "Aliyan Asif" });
          } else {
            setUserData({ role: "Staff", name: "Employee" }); 
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);