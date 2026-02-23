"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    runTransaction,
    serverTimestamp,
    increment,
    orderBy
} from "firebase/firestore";
import {
    Search,
    User,
    Package,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Phone,
    CreditCard,
    Zap,
    Menu
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminBuyProductPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchPhone, setSearchPhone] = useState("");
    const [targetUser, setTargetUser] = useState<any>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchPhone.trim()) return;

        setIsSearching(true);
        setTargetUser(null);
        setStatusMsg(null);

        try {
            const usersRef = collection(db, "users");
            let phoneToSearch = searchPhone.trim();

            // Try raw input
            let q = query(usersRef, where("phoneNumber", "==", phoneToSearch));
            let snap = await getDocs(q);

            // If not found and input doesn't start with +, try adding it
            if (snap.empty && !phoneToSearch.startsWith("+")) {
                q = query(usersRef, where("phoneNumber", "==", "+" + phoneToSearch));
                snap = await getDocs(q);
            }

            if (snap.empty) {
                setStatusMsg({ type: "error", text: "User not found." });
            } else {
                setTargetUser({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
        } catch (error: any) {
            console.error("Search error:", error);
            setStatusMsg({ type: "error", text: "Error searching user." });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAutoPurchase = async () => {
        if (!targetUser) return;
        setIsPurchasing(true);
        setStatusMsg(null);

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Get Fresh User Data
                const userRef = doc(db, "users", targetUser.id);
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) throw new Error("User no longer exists.");

                const userData = userSnap.data();
                const rechargeBalance = Number(userData.Recharge || 0);

                // 2. Fetch All Products
                const productsRef = collection(db, "Products");
                const productsSnap = await getDocs(productsRef); // Read outside transaction if possible, but for simple logic we can do here or just before
                const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. Fetch User Orders to check limits
                const ordersRef = collection(db, "UserOrders");
                const qOrders = query(ordersRef, where("userId", "==", targetUser.id));
                const ordersSnap = await getDocs(qOrders);
                const userOrders = ordersSnap.docs.map(d => d.data());

                // 4. Find the best product
                const affordableProducts = allProducts.filter((p: any) => {
                    if (p.price > rechargeBalance) return false;

                    const boughtCount = userOrders.filter((o: any) => o.productId === p.id).length;
                    return boughtCount < (p.purchaseLimit || 1);
                });

                if (affordableProducts.length === 0) {
                    throw new Error("No affordable products available for this user's balance.");
                }

                // Sort by price descending to get the most expensive one
                affordableProducts.sort((a: any, b: any) => b.price - a.price);
                const selectedProduct: any = affordableProducts[0];

                // 5. Execute Purchase
                const orderRef = doc(collection(db, "UserOrders"));
                transaction.set(orderRef, {
                    userId: targetUser.id,
                    productId: selectedProduct.id,
                    productName: selectedProduct.name,
                    price: selectedProduct.price,
                    dailyIncome: selectedProduct.dailyIncome,
                    contractPeriod: selectedProduct.contractPeriod,
                    remainingDays: selectedProduct.contractPeriod,
                    totalProfit: selectedProduct.totalProfit,
                    principalIncome: selectedProduct.principalIncome,
                    status: "active",
                    purchaseDate: serverTimestamp(),
                    lastSync: serverTimestamp()
                });

                transaction.update(userRef, {
                    Recharge: rechargeBalance - selectedProduct.price,
                    dailyIncome: increment(selectedProduct.dailyIncome)
                });

                return selectedProduct;
            });

            setStatusMsg({ type: "success", text: "Auto-purchase completed successfully!" });
            // Refresh user data (simplified)
            handleSearch();
        } catch (error: any) {
            console.error("Purchase error:", error);
            setStatusMsg({ type: "error", text: error.message || "Failed to complete purchase." });
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-30">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <Menu size={24} className="text-gray-600" />
                    </button>
                    <div className="hidden md:block">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                            Manager / <span className="text-indigo-600">Buy Product</span>
                        </h2>
                    </div>
                    <div className="w-10 h-10 p-1 rounded-full border-2 border-indigo-100 overflow-hidden">
                        <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                    </div>
                </header>

                <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
                    {/* Welcome Card */}
                    <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-slate-100 mb-8 overflow-hidden relative group">
                        <div className="relative z-10">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">Buy Product Assistant 🛍️</h1>
                            <p className="text-slate-500 font-medium">Search for a user and automatically purchase the highest value product available for their balance.</p>
                        </div>
                        <div className="absolute -top-10 -right-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none transform group-hover:rotate-12 duration-700">
                            <Package size={240} className="text-indigo-600" />
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 mb-8">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative group">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Enter User Phone Number..."
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    className="w-full h-16 pl-14 pr-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600/10 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="h-16 px-10 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSearching ? <Loader2 size={24} className="animate-spin" /> : <> <Search size={24} /> SEARCH </>}
                            </button>
                        </form>
                    </div>

                    {/* Result Card */}
                    {targetUser && (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-50 flex flex-col md:flex-row items-center gap-10">
                                {/* Profile Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-2xl flex items-center justify-center text-indigo-200 overflow-hidden">
                                        <User size={80} strokeWidth={1} />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-indigo-600 border border-slate-50">
                                        <Zap size={24} fill="currentColor" />
                                    </div>
                                </div>

                                {/* User Details and Action */}
                                <div className="flex-1 space-y-8 w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Phone Identity</p>
                                            <p className="text-lg font-black text-slate-900">{targetUser.phoneNumber}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">VIP Level</p>
                                            <p className="text-lg font-black text-indigo-600">Level {targetUser.vip || 0}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Country</p>
                                            <p className="text-lg font-black text-slate-700">{targetUser.country || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Recharge Balance</p>
                                            <div className="flex items-center gap-2 text-indigo-600">
                                                <CreditCard size={16} />
                                                <p className="text-lg font-black">{Number(targetUser.Recharge || 0).toLocaleString()} Br</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Wallet Balance</p>
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <Zap size={16} />
                                                <p className="text-lg font-black">{Number(targetUser.balance || 0).toLocaleString()} Br</p>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Recharged</p>
                                            <p className="text-lg font-black text-slate-900">{Number(targetUser.totalRecharge || 0).toLocaleString()} Br</p>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2 md:col-span-3">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">User UID</p>
                                            <p className="text-xs font-mono font-bold text-slate-400 bg-slate-50 p-2 rounded-lg break-all">{targetUser.uid}</p>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-50"></div>

                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        <button
                                            onClick={handleAutoPurchase}
                                            disabled={isPurchasing || Number(targetUser.Recharge || 0) <= 0}
                                            className="w-full sm:flex-1 h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                        >
                                            {isPurchasing ? (
                                                <Loader2 size={24} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Package size={24} />
                                                    AUTO-PURCHASE HIGHEST
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setTargetUser(null)}
                                            className="w-full sm:w-auto h-16 px-8 rounded-[1.5rem] border border-slate-100 text-slate-400 font-bold hover:bg-slate-50 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {Number(targetUser.Recharge || 0) <= 0 && (
                                        <p className="text-center text-rose-500 text-xs font-black uppercase tracking-widest animate-pulse">
                                            Insufficient balance for any plan.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Message */}
                    {statusMsg && (
                        <div className={`mt-8 p-6 rounded-[1.5rem] flex items-center gap-4 animate-in zoom-in-95 duration-300 ${statusMsg.type === 'success'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                            {statusMsg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            <p className="font-black text-sm uppercase tracking-tight">{statusMsg.text}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
