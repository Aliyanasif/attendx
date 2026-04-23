import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBESvkvsZRRXTkj4uj_G2sMJw34Kr98ZHk",
  authDomain: "attendx-f70b9.firebaseapp.com",
  projectId: "attendx-f70b9",
  storageBucket: "attendx-f70b9.firebasestorage.app",
  messagingSenderId: "1002066034652",
  appId: "1:1002066034652:web:9337b7486e12b630309919"
};

// Firebase initialize (Check if already initialized to prevent errors)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };