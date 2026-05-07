import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";

// 1. Aapki Provide ki hui Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBEsvkvSZRRXTkj4uj_G2sMJw34Kr98ZHk",
  authDomain: "attendx-f70b9.firebaseapp.com",
  projectId: "attendx-f70b9",
  storageBucket: "attendx-f70b9.firebasestorage.app",
  messagingSenderId: "1002066034652",
  appId: "1:1002066034652:web:9337b7486e12b630309919"
};

// 2. Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 3. Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 4. Notification Permission Function
export const requestNotificationPermission = async (userId: string) => {
  try {
    if (typeof window === "undefined") return;

    const messagingSupported = await isSupported();
    if (!messagingSupported) return;

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      // Yahan apni VAPID key paste karen (Jo settings se nikaali thi)
      const token = await getToken(messaging, {
        vapidKey: "BA0wdCedKCbuV5fYlsZ_08cBtYrrLKZeqbqOr5B0nG0pptM5UrXlQx0qs3i-MRdNUmmFB77zYHDgSp-RH1Z20sc" 
      });

      if (token) {
        console.log("FCM Token:", token);
        const userRef = doc(db, "employees", userId); // Check karen collection name 'users' hai ya 'employees'
        await updateDoc(userRef, { 
          fcmToken: token,
          notificationsEnabled: true 
        });
      }
    }
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

export default app;