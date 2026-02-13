import { db } from "./firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    writeBatch,
    Timestamp,
    serverTimestamp,
    increment,
    runTransaction
} from "firebase/firestore";

/**
 * Weekend Daily Income System
 * 
 * Automatically runs when user opens the app
 * Checks if it's after midnight (00:00) and credits daily income to weekendBalance
 * Based on purchaseDate tracking from WeekendUserOrders collection
 */
export async function syncWeekendDailyIncome(currentUserId?: string) {
    try {
        // If no user ID provided (e.g. not logged in yet), skip
        if (!currentUserId) return;

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        console.log(`[Weekend Daily Income] Checking sync for user ${currentUserId} on ${todayStr}`);

        // 1. Concurrency Guard: Check if already synced today using a Transaction
        const userRef = doc(db, "users", currentUserId);
        const canSync = await runWeekendSyncGuard(userRef, todayStr);

        if (!canSync) {
            console.log(`[Weekend Daily Income] User ${currentUserId} already synced for ${todayStr}. Skipping.`);
            return;
        }

        // 2. Get ONLY this user's active weekend orders
        const ordersRef = collection(db, "WeekendUserOrders");
        const q = query(
            ordersRef,
            where("userId", "==", currentUserId),
            where("status", "==", "active")
        );
        const ordersSnap = await getDocs(q);

        if (ordersSnap.empty) {
            console.log("[Weekend Daily Income] No active weekend orders found for user.");
            return;
        }

        let totalPayout = 0;
        const updates: any[] = [];

        ordersSnap.docs.forEach(orderDoc => {
            const data = orderDoc.data();
            const dailyIncome = Number(data.dailyIncome || 0);
            const remainingDays = Number(data.remainingDays || 0);
            const purchaseDate = data.purchaseDate instanceof Timestamp ? data.purchaseDate.toDate() : new Date(data.purchaseDate);
            const lastSync = data.lastSync instanceof Timestamp ? data.lastSync.toDate() : new Date(data.lastSync || 0);

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
                }

                updates.push({
                    id: orderDoc.id,
                    dailyIncome: dailyIncome,
                    remainingDays: newRemainingDays,
                    status: newStatus
                });
            }
        });

        if (updates.length === 0) {
            console.log("[Weekend Daily Income] User already synced today.");
            return;
        }

        console.log(`[Weekend Daily Income] Syncing ${updates.length} orders. Total Payout: ${totalPayout}`);

        // Update Orders in a Batch
        const batch = writeBatch(db);

        // Update each order's weekendBalance, remainingDays, status, and lastSync
        for (const update of updates) {
            const orderRef = doc(db, "WeekendUserOrders", update.id);
            batch.update(orderRef, {
                weekendBalance: increment(update.dailyIncome), // Add daily income to weekend balance
                remainingDays: update.remainingDays,
                status: update.status,
                lastSync: serverTimestamp()
            });
        }

        await batch.commit();
        console.log("[Weekend Daily Income] Sync completed successfully.");

    } catch (error) {
        console.error("[Weekend Daily Income] Error:", error);
    }
}

/**
 * Ensures sync only runs once per day per user using a transaction
 */
async function runWeekendSyncGuard(userRef: any, todayStr: string): Promise<boolean> {
    try {
        const { runTransaction } = await import("firebase/firestore");
        return await runTransaction(db, async (transaction) => {
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists()) return false;

            const userData = userSnap.data() as any;
            if (userData && userData.lastWeekendIncomeSyncDay === todayStr) {
                return false; // Already synced today
            }

            // Mark as synced for today
            transaction.update(userRef, {
                lastWeekendIncomeSyncDay: todayStr
            });
            return true;
        });
    } catch (e) {
        console.error("[Weekend Sync Guard] Transaction failed:", e);
        return false;
    }
}
