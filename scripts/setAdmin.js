const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const admin = require("firebase-admin");

const email = process.argv[2];
const password = process.argv[3] || process.env.ADMIN_INITIAL_PASSWORD;

if (!email) {
    console.error("Usage: node scripts/setAdmin.js <email> [password]");
    process.exit(1);
}

function loadServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    const keyPath = path.resolve(__dirname, "../MsdpharmaServiceAccountKey.json");
    if (!fs.existsSync(keyPath)) {
        throw new Error(
            "Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or add MsdpharmaServiceAccountKey.json"
        );
    }
    return JSON.parse(fs.readFileSync(keyPath, "utf8"));
}

if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount();
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });
}

function defaultUserFields(uid, userEmail) {
    return {
        uid,
        email: userEmail,
        country: "Ethiopia",
        phoneNumber: "",
        vip: 0,
        balance: 0,
        Recharge: 0,
        totalRecharge: 0,
        totalWithdrawal: 0,
        teamIncome: 0,
        taskIncome: 0,
        teamSize: 0,
        investedTeamSize: 0,
        teamAssets: 0,
        totalIncome: 0,
        dailyIncome: 0,
        inviterA: null,
        inviterB: null,
        inviterC: null,
        inviterD: null,
        role: "admin",
        isAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
}

async function resolveAuthUser() {
    try {
        return await admin.auth().getUserByEmail(email);
    } catch (error) {
        if (error.code !== "auth/user-not-found") {
            throw error;
        }
        if (!password) {
            throw new Error(
                `No Firebase Auth user for ${email}. Re-run with a password if you need to create the account.`
            );
        }
        console.log("Creating Firebase Auth user:", email);
        return await admin.auth().createUser({
            email,
            password,
            emailVerified: true,
        });
    }
}

async function setAdmin() {
    try {
        const user = await resolveAuthUser();

        await admin.auth().setCustomUserClaims(user.uid, { admin: true });

        const db = admin.firestore();
        await db.collection("users").doc(user.uid).set(defaultUserFields(user.uid, user.email), {
            merge: true,
        });

        console.log("✅ Admin role applied:", email);
        console.log("✅ users collection document created/updated:", user.uid);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error setting admin:", error.message);
        process.exit(1);
    }
}

setAdmin().catch(console.error);
