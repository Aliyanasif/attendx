"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  userData: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          setUserData(null);
          return;
        }

        setUser(firebaseUser);

        const email = firebaseUser.email?.trim().toLowerCase();

        if (!email) {
          setUserData({
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            role: "Staff",
            name: firebaseUser.displayName || "Employee",
            email: "",
            status: "active",
          });
          return;
        }

        const q = query(
          collection(db, "employees"),
          where("email", "==", email)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const dbData = userDoc.data();

          setUserData({
            id: userDoc.id,
            uid: dbData.uid || firebaseUser.uid,
            ...dbData,
            email: dbData.email || email,
          });
        } else {
          setUserData({
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            role: "Staff",
            name: firebaseUser.displayName || "Employee",
            email,
            status: "active",
            setupComplete: true,
          });
        }
      } catch (error) {
        console.error("AuthContext Firestore Error:", error);

        setUserData({
          uid: firebaseUser?.uid || "",
          id: firebaseUser?.uid || "",
          role: "Staff",
          name: firebaseUser?.displayName || "Employee",
          email: firebaseUser?.email || "",
          status: "active",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      user,
      userData,
      loading,
    }),
    [user, userData, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);