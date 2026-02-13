import { db } from "./firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    writeBatch,
    Timestamp,
    serverTimestamp,
    increment,
    runTransaction
} from "firebase/firestore";

/**
 * Simple Daily Income System
 * 
 * Automatically runs when user opens the app
 * Checks if it's after midnight (00:00) and credits daily income
 * Based on purchaseDate tracking from UserOrders collection
 */
export async function syncDailyIncome(currentUserId?: string) {
    try {
        // If no user ID provided (e.g. not logged in yet), skip
        if (!currentUserId) return;

        const now = new Date();
        const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.

        // Fetch income settings to check active days
        const settingsRef = doc(db, "GlobalSettings", "income");
        const settingsSnap = await getDoc(settingsRef);
        const activeDays = settingsSnap.exists() ? settingsSnap.data().activeDays : [1, 2, 3, 4, 5, 6];

        if (!activeDays.includes(currentDay)) {
            console.log(`[Daily Income] Today (day ${currentDay}) is not an active income day. Skipping sync.`);
            return;
        }

        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        console.log(`[Daily Income] Checking sync for user ${currentUserId} on ${todayStr}`);

        // 1. Get ONLY this user's active orders
        const ordersRef = collection(db, "UserOrders");
        const q = query(
            ordersRef,
            where("userId", "==", currentUserId),
            where("status", "==", "active")
        );
        const ordersSnap = await getDocs(q);

        if (ordersSnap.empty) {
            console.log("[Daily Income] No active orders found for user.");
            return;
        }

        const userRef = doc(db, "users", currentUserId);
        const canSync = await runSyncGuard(userRef, todayStr);

        if (!canSync) {
            console.log(`[Daily Income] User ${currentUserId} already synced for ${todayStr}. Skipping.`);
            return;
        }

        let totalPayout = 0;
        let totalActiveDailyIncome = 0; // Sum of dailyIncome for ALL active orders
        const updates: any[] = [];

        ordersSnap.docs.forEach(orderDoc => {
            const data = orderDoc.data();
            const dailyIncome = Number(data.dailyIncome || 0);
            const remainingDays = Number(data.remainingDays || 0);
            const purchaseDate = data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
            const lastSync = data.lastSync instanceof Timestamp ? data.lastSync.toDate() : new Date(data.lastSync || 0);

            let isActiveAfterUpdate = true;
            let newStatus = "active";
            let newRemainingDays = remainingDays;

            // Check eligibility for PAYOUT:
            // 1. Purchased before today's midnight
            // 2. Has remaining days
            // 3. Has NOT been synced today (lastSync < todayMidnight)
            if (purchaseDate < todayMidnight && remainingDays > 0 && lastSync < todayMidnight) {
                totalPayout += dailyIncome;

                newRemainingDays = remainingDays - 1;
                if (newRemainingDays <= 0) {
                    newStatus = "completed";
                    isActiveAfterUpdate = false;
                }

                updates.push({
                    id: orderDoc.id,
                    remainingDays: newRemainingDays,
                    status: newStatus
                });
            }

            // Only include in TOTAL RATE if it remains active after this sync
            if (isActiveAfterUpdate) {
                totalActiveDailyIncome += dailyIncome;
            }
        });

        if (updates.length > 0 || totalPayout > 0) {
            console.log(`[Daily Income] Syncing ${updates.length} orders. Payout: ${totalPayout}. Total Rate: ${totalActiveDailyIncome}`);

            // Update User and Orders in a Batch
            const batch = writeBatch(db);

            // Update User Balance
            batch.update(userRef, {
                balance: increment(totalPayout),
                totalIncome: increment(totalPayout),
                dailyIncome: totalActiveDailyIncome
            });

            // Update Orders
            for (const update of updates) {
                const orderRef = doc(db, "UserOrders", update.id);
                batch.update(orderRef, {
                    remainingDays: update.remainingDays,
                    status: update.status,
                    lastSync: serverTimestamp()
                });
            }

            await batch.commit();
            console.log("[Daily Income] Sync completed successfully.");
        } else {
            console.log("[Daily Income] No payouts to process today.");
        }

    } catch (error) {
        console.error("[Daily Income] Error:", error);
    }
}

/**
 * Ensures sync only runs once per day per user using a transaction
 */
async function runSyncGuard(userRef: any, todayStr: string): Promise<boolean> {
    try {
        return await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) return false;

            const userData = userSnap.data() as any;
            if (userData && userData.lastIncomeSyncDay === todayStr) {
                return false; // Already synced today
            }

            // Mark as synced for today immediately in the transaction
            transaction.update(userRef, {
                lastIncomeSyncDay: todayStr
            });
            return true;
        });
    } catch (e) {
        console.error("[Sync Guard] Transaction failed:", e);
        return false;
    }
}
