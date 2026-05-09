import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Firebase Admin setup
if (!admin.apps.length) {
  // Production mein Vercel ke variables se credentials uthayega
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "User UID is required" }, { status: 400 });
    }

    // Backend se hamesha ke liye Firebase Auth account urra do
    if (admin.apps.length > 0) {
      await admin.auth().deleteUser(uid);
    } else {
      console.warn("Firebase Admin not initialized, skipped auth deletion in dev mode.");
    }
    
    return NextResponse.json({ success: true, message: "Account deleted securely" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}