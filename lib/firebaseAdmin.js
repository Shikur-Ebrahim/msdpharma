const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
    // User specified path: "C:\Users\shikur\Downloads\MSDServiceAccountKey.json"
    // Using forward slashes for JS string compatibility
    const keyPath = "C:/Users/shikur/Downloads/MsdpharmaServiceAccountKey.json";

    if (fs.existsSync(keyPath)) {
        try {
            const serviceAccount = require(keyPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            console.log(`✅ [Firebase Admin] Loaded credentials from: ${keyPath}`);
        } catch (error) {
            console.error(`❌ [Firebase Admin] Failed to parse/load key file: ${error.message}`);
            process.exit(1);
        }
    } else {
        console.error(`❌ [Firebase Admin] FATAL: 'MsdpharmaServiceAccountKey.json' not found.`);
        console.error(`👉 Expected path: ${keyPath}`);
        console.error(`👉 Please ensure the file exists at this location.`);
        process.exit(1);
    }
}

module.exports = admin;
