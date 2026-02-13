import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    // Static relative path – no C:/ path, no variable in require
    // This expects: projectRoot/MsdpharmaServiceAccountKey.json
    // and this file is at: projectRoot/lib/firebaseAdmin.js
    // so "../MsdpharmaServiceAccountKey.json" is correct.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require("../MsdpharmaServiceAccountKey.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log(
      "✅ [Firebase Admin] Loaded credentials from ../MsdpharmaServiceAccountKey.json"
    );
  } catch (error) {
    console.error(
      "❌ [Firebase Admin] Failed to parse/load key file:",
      error && error.message ? error.message : error
    );
    process.exit(1);
  }

}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export default admin;
