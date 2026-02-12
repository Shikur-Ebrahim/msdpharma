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
    increment
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

        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        console.log(`[Daily Income] Checking sync for user ${currentUserId} on ${todayStr}`);

        // Get ONLY this user's active orders
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

        // Even if no payout is due (updates.length === 0), we should still update the dailyIncome rate
        // But to avoid excessive writes, we can do it only if there's a payout OR if we want to ensure consistency.
        // For now, let's proceed if there are updates.

        if (updates.length === 0) {
            console.log("[Daily Income] User already synced today.");
            // Optional: If you want to force update dailyIncome rate even if synced, do it here.
            // But usually rate changes only on purchase/expiry.
            return;
        }

        console.log(`[Daily Income] Syncing ${updates.length} orders. Payout: ${totalPayout}. Total Rate: ${totalActiveDailyIncome}`);

        // Update User and Orders in a Batch
        const batch = writeBatch(db);
        const userRef = doc(db, "users", currentUserId);

        // Update User Balance
        batch.update(userRef, {
            balance: increment(totalPayout),
            totalIncome: increment(totalPayout),
            dailyIncome: totalActiveDailyIncome // Set to TOTAL active income sum, not just today's payout
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

    } catch (error) {
        console.error("[Daily Income] Error:", error);
    }
}
