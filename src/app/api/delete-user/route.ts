import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    privateKey
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: "User UID is required" },
        { status: 400 }
      );
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: "Firebase Admin is not initialized." },
        { status: 500 }
      );
    }

    await admin.auth().deleteUser(uid);

    return NextResponse.json(
      { success: true, message: "Account deleted securely." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete Error:", error);

    return NextResponse.json(
      { error: error.message || "Delete failed." },
      { status: 500 }
    );
  }
}