import "server-only";
import admin from "firebase-admin";

function parseServiceAccount(): admin.ServiceAccount | null {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw) as admin.ServiceAccount;
    } catch (error) {
        console.error("❌ [Firebase Admin] Invalid FIREBASE_SERVICE_ACCOUNT JSON:", error);
        return null;
    }
}

if (!admin.apps.length) {
    const serviceAccount = parseServiceAccount();
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("✅ [Firebase Admin] Initialized from FIREBASE_SERVICE_ACCOUNT");
    } else if (process.env.VERCEL) {
        console.warn(
            "⚠️ [Firebase Admin] Not initialized on Vercel. Set FIREBASE_SERVICE_ACCOUNT in project environment variables."
        );
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export default admin;
