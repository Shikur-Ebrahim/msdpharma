import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    let serviceAccount;

    // 1. Try environment variable first (Recommended for Vercel/Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log("✅ [Firebase Admin] Initializing with FIREBASE_SERVICE_ACCOUNT env var");
    }
    // 2. Fallback to local JSON file (For local development)
    else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        serviceAccount = require("../MsdpharmaServiceAccountKey.json");
        console.log("✅ [Firebase Admin] Initializing with local service account key file");
      } catch (fileError) {
        // Only throw if not on Vercel, otherwise wait for env vars
        if (process.env.VERCEL) {
          console.error("❌ [Firebase Admin] Missing credentials on Vercel. Please set FIREBASE_SERVICE_ACCOUNT env var.");
        } else {
          throw new Error("Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or add MsdpharmaServiceAccountKey.json");
        }
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }
  } catch (error) {
    console.error(
      "❌ [Firebase Admin] Initialization failed:",
      error && error.message ? error.message : error
    );
    // Important: Don't exit process in Vercel build unless it's a fatal runtime error
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export default admin;
