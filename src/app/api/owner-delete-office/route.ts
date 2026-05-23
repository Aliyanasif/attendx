import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = admin.firestore();

async function deleteByQuery(collectionName: string, field: string, value: string) {
  const snap = await db.collection(collectionName).where(field, "==", value).get();
  const batch = db.batch();

  snap.docs.forEach((doc) => batch.delete(doc.ref));

  if (!snap.empty) await batch.commit();

  return snap.size;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    if (decoded.email !== process.env.OWNER_EMAIL) {
      return NextResponse.json({ error: "Owner access only" }, { status: 403 });
    }

    const { adminUid, adminDocId } = await req.json();

    if (!adminUid || !adminDocId) {
      return NextResponse.json({ error: "adminUid and adminDocId required" }, { status: 400 });
    }

    const staffSnap = await db
      .collection("employees")
      .where("adminUid", "==", adminUid)
      .get();

    const staffUids = staffSnap.docs
      .map((d) => d.data().uid)
      .filter(Boolean);

    await deleteByQuery("attendance", "adminUid", adminUid);
    await deleteByQuery("leaves", "adminUid", adminUid);
    await deleteByQuery("resignations", "adminUid", adminUid);
    await deleteByQuery("salary_history", "adminUid", adminUid);

    const empBatch = db.batch();
    staffSnap.docs.forEach((doc) => empBatch.delete(doc.ref));
    empBatch.delete(db.collection("employees").doc(adminDocId));
    await empBatch.commit();

    const authUids = Array.from(new Set([adminUid, ...staffUids]));

    for (const uid of authUids) {
      try {
        await admin.auth().deleteUser(uid);
      } catch (err) {
        console.warn("Auth delete skipped:", uid);
      }
    }

    return NextResponse.json({
      success: true,
      deletedStaff: staffSnap.size,
      deletedAuthUsers: authUids.length,
    });
  } catch (error: any) {
    console.error("Owner delete office error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}