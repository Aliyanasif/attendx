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
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

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

const normalizeRole = (role?: string) => {
  const value = (role || "").toLowerCase().trim();

  if (
    value === "admin" ||
    value === "owner" ||
    value === "manager" ||
    value === "super admin" ||
    value === "superadmin"
  ) {
    return "Admin";
  }

  return "Staff";
};

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

        const uid = firebaseUser.uid;
        const email = firebaseUser.email?.trim().toLowerCase() || "";
        const name = firebaseUser.displayName || "Aliyan Asif";

        // 1. First check exact document by UID
        const directRef = doc(db, "employees", uid);
        const directSnap = await getDoc(directRef);

        if (directSnap.exists()) {
          const data = directSnap.data();

          setUserData({
            id: directSnap.id,
            uid: data.uid || uid,
            ...data,
            email: data.email || email,
            role: normalizeRole(data.role),
            adminUid: data.adminUid || uid,
            officeName: data.officeName || "AttendX",
            status: data.status || "active",
          });

          return;
        }

        // 2. Then check by email
        if (email) {
          const q = query(
            collection(db, "employees"),
            where("email", "==", email)
          );

          const snap = await getDocs(q);

          if (!snap.empty) {
            const userDoc = snap.docs[0];
            const data = userDoc.data();

            setUserData({
              id: userDoc.id,
              uid: data.uid || uid,
              ...data,
              email: data.email || email,
              role: normalizeRole(data.role),
              adminUid: data.adminUid || uid,
              officeName: data.officeName || "AttendX",
              status: data.status || "active",
            });

            return;
          }
        }

        // 3. If no employee record exists, treat logged-in account as workspace owner/admin
        // This fixes your current issue where admin was being treated as staff.
        const ownerData = {
          uid,
          adminUid: uid,
          name,
          email,
          role: "Admin",
          designation: "Workspace Owner",
          officeName: "AttendX",
          salary: 0,
          dutyHours: 9,
          shiftStart: "09:00",
          shiftEnd: "18:00",
          status: "active",
          isPremium: true,
          setupComplete: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(directRef, ownerData, { merge: true });

        setUserData({
          id: uid,
          ...ownerData,
        });
      } catch (error) {
        console.error("AuthContext Firestore Error:", error);

        setUserData({
          uid: firebaseUser?.uid || "",
          id: firebaseUser?.uid || "",
          adminUid: firebaseUser?.uid || "",
          role: "Admin",
          name: firebaseUser?.displayName || "Aliyan Asif",
          email: firebaseUser?.email || "",
          officeName: "AttendX",
          status: "active",
          isPremium: true,
          setupComplete: true,
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