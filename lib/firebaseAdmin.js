const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

if (!admin.apps.length) {
    // 1. Try Environment Variable (Best for production)
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

    // 2. Try Downloads Folder (User PREFERRED location)
    const downloadsKeyPath = "C:/Users/shikur/Downloads/MsdpharmaServiceAccountKey.json";

    // 3. Try Project Root (Fallback)
    const localKeyPath = path.join(process.cwd(), "service-account.json");

    let serviceAccount = null;

    if (serviceAccountEnv) {
        try {
            serviceAccount = JSON.parse(serviceAccountEnv);
            console.log("✅ [Firebase Admin] Loaded credentials from Environment Variable");
        } catch (e) {
            console.error("❌ [Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT env var");
        }
    }

    // Try Downloads folder (reading file directly to avoid Webpack bundling issues)
    if (!serviceAccount && fs.existsSync(downloadsKeyPath)) {
        try {
            const fileContent = fs.readFileSync(downloadsKeyPath, "utf8");
            serviceAccount = JSON.parse(fileContent);
            console.log(`✅ [Firebase Admin] Loaded credentials from: ${downloadsKeyPath}`);
        } catch (e) {
            console.error(`❌ [Firebase Admin] Failed to read downloads key file: ${e.message}`);
        }
    }

    // Try Local Project file
    if (!serviceAccount && fs.existsSync(localKeyPath)) {
        try {
            const fileContent = fs.readFileSync(localKeyPath, "utf8");
            serviceAccount = JSON.parse(fileContent);
            console.log(`✅ [Firebase Admin] Loaded credentials from: ${localKeyPath}`);
        } catch (e) {
            console.error(`❌ [Firebase Admin] Failed to read local key file: ${e.message}`);
        }
    }

    if (serviceAccount) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        } catch (error) {
            console.error(`❌ [Firebase Admin] Initialization failed: ${error.message}`);
        }
    } else {
        console.error(`\n❌ [Firebase Admin] FATAL ERROR: Service Account Key Not Found.`);
        console.error(`Please do ONE of the following:`);
        console.error(`1. Place 'service-account.json' in: ${process.cwd()}`);
        console.error(`2. Place 'MsdpharmaServiceAccountKey.json' in: C:/Users/shikur/Downloads/`);
        console.error(`3. Set FIREBASE_SERVICE_ACCOUNT environment variable with the JSON content.\n`);
        // We don't exit process here to avoid crashing the whole dev server on reload, 
        // but API routes using this will fail.
    }
}

module.exports = admin;
