"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    getDocs,
    updateDoc,
    doc
} from "firebase/firestore";
import {
    Package,
    Users,
    Calendar,
    BadgeCheck,
    Clock,
    TrendingUp,
    Phone,
    DollarSign,
    Menu,
    Search,
    ChevronDown,
    ChevronUp,
    Filter,
    Edit3,
    X as CloseIcon,
    Save
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminSalesTrackingPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [editPrice, setEditPrice] = useState("");
    const [editDailyIncome, setEditDailyIncome] = useState("");
    const [editContract, setEditContract] = useState("");
    const [editRemainingDays, setEditRemainingDays] = useState("");
    const [updating, setUpdating] = useState(false);

    const handleEditClick = (order: any) => {
        setSelectedOrder(order);
        setEditPrice(order.price?.toString() || "");
        setEditDailyIncome(order.dailyIncome?.toString() || "");
        setEditContract(order.contractPeriod?.toString() || "");
        setEditRemainingDays(order.remainingDays?.toString() || "");
        setIsEditModalOpen(true);
    };

    const handleUpdateOrder = async () => {
        if (!selectedOrder) return;
        setUpdating(true);
        try {
            const orderRef = doc(db, "UserOrders", selectedOrder.id);
            await updateDoc(orderRef, {
                price: Number(editPrice),
                dailyIncome: Number(editDailyIncome),
                contractPeriod: Number(editContract),
                remainingDays: Number(editRemainingDays)
            });
            setIsEditModalOpen(false);
            // Result will be updated via real-time listener (onSnapshot)
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to update order. Check console.");
        } finally {
            setUpdating(false);
        }
    };

    useEffect(() => {
        // 1. Fetch Users phone numbers map
        const fetchUsers = async () => {
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const mapping: { [key: string]: string } = {};
                usersSnap.docs.forEach(doc => {
                    mapping[doc.id] = doc.data().phoneNumber || "Unknown";
                });
                setUsersMap(mapping);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };

        fetchUsers();

        // 2. Real-time Orders Listener
        const qOrders = query(collection(db, "UserOrders"), orderBy("purchaseDate", "desc"));
        const unsubscribe = onSnapshot(qOrders, (snapshot) => {
            const orderData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(orderData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredOrders = orders.filter(order => {
        const phoneNumber = usersMap[order.userId] || "";
        const matchesSearch =
            order.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            phoneNumber.includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const activeOrdersCount = orders.filter(o => o.status === "active").length;
    const totalSalesValue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

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
                            Manager / <span className="text-indigo-600">Sales Tracking</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Total Sales</span>
                            <span className="text-lg font-black text-slate-900 leading-none">{totalSalesValue.toLocaleString()} <span className="text-[10px] opacity-40">ETB</span></span>
                        </div>
                        <div className="w-10 h-10 p-1 rounded-full border-2 border-indigo-100 overflow-hidden">
                            <img src="/logo.png" alt="Admin" className="w-full h-full object-contain" />
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-8 overflow-y-auto w-full max-w-6xl mx-auto space-y-8">
                    {/* Hero Info */}
                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Sales Analytics 📈</h1>
                            <p className="text-slate-500 font-medium">Real-time tracking of all products sold across the platform.</p>

                            <div className="flex flex-wrap gap-4 mt-8">
                                <div className="bg-indigo-50 border border-indigo-100 px-5 py-3 rounded-2xl">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Active Deals</p>
                                    <p className="text-xl font-black text-indigo-600 leading-none">{activeOrdersCount}</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Gross Sales</p>
                                    <p className="text-xl font-black text-emerald-600 leading-none">{totalSalesValue.toLocaleString()} ETB</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-12 -right-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none">
                            <TrendingUp size={280} className="text-indigo-600" />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-7 relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by product, phone, or order ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600/20 font-bold text-slate-700"
                            />
                        </div>
                        <div className="md:col-span-5 flex gap-4">
                            <div className="flex-1 relative">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border border-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-700 appearance-none cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active Only</option>
                                    <option value="completed">Completed Only</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sales List */}
                    <div className="space-y-4 pb-20">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Filtering Blockchain Index...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-20 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                                <Package size={64} className="text-slate-100 mb-4" />
                                <h3 className="text-xl font-black text-slate-900 uppercase">No Matches Found</h3>
                                <p className="text-slate-400 font-medium">Try adjusting your search or filters.</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const phone = usersMap[order.userId] || "Loading...";
                                const purchaseDate = order.purchaseDate?.toDate ? order.purchaseDate.toDate() : new Date(order.purchaseDate);

                                return (
                                    <div key={order.id} className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 hover:border-indigo-100 transition-all group relative overflow-hidden">
                                        {/* Status Tag */}
                                        <div className="absolute top-0 right-0">
                                            <div className={`px-6 py-2 rounded-bl-[1.5rem] text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${order.status === 'active' ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-slate-400 shadow-slate-400/20'}`}>
                                                {order.status}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleEditClick(order)}
                                            className="absolute bottom-6 right-8 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl hover:shadow-indigo-600/10 transition-all z-20"
                                            title="Edit Order"
                                        >
                                            <Edit3 size={18} />
                                        </button>

                                        <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                                            {/* Product Identity */}
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                        <Package size={28} className="text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">{order.productName}</h3>
                                                        <p className="text-xs font-mono font-bold text-slate-300 mt-1 uppercase tracking-tighter">ID: {order.id}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                                        <Phone size={14} className="text-indigo-500" />
                                                        <span className="text-sm font-black text-slate-700">{phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                                        <BadgeCheck size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{order.productId}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Financials Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-8 lg:border-l lg:border-slate-50 lg:pl-8">
                                                <div className="bg-slate-50/50 p-3 sm:p-0 rounded-2xl sm:bg-transparent border border-slate-100 sm:border-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Price</p>
                                                    <p className="text-sm sm:text-base font-black text-slate-900">{Number(order.price || 0).toLocaleString()} <span className="text-[9px] opacity-40">ETB</span></p>
                                                </div>
                                                <div className="bg-indigo-50/30 p-3 sm:p-0 rounded-2xl sm:bg-transparent border border-indigo-100/50 sm:border-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Daily</p>
                                                    <p className="text-sm sm:text-base font-black text-indigo-600">{Number(order.dailyIncome || 0).toLocaleString()} <span className="text-[9px] opacity-40">ETB</span></p>
                                                </div>
                                                <div className="bg-emerald-50/30 p-3 sm:p-0 rounded-2xl sm:bg-transparent border border-emerald-100/50 sm:border-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profit</p>
                                                    <p className="text-sm sm:text-base font-black text-emerald-600">{Number(order.totalProfit || 0).toLocaleString()} <span className="text-[9px] opacity-40">ETB</span></p>
                                                </div>
                                                <div className="bg-slate-50/50 p-3 sm:p-0 rounded-2xl sm:bg-transparent border border-slate-100 sm:border-0">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                                                    <p className="text-sm sm:text-base font-black text-slate-900">{Number(order.principalIncome || 0).toLocaleString()} <span className="text-[9px] opacity-40">ETB</span></p>
                                                </div>
                                            </div>

                                            {/* Lifecycle */}
                                            <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-start gap-4 lg:w-48 lg:border-l lg:border-slate-50 lg:pl-8 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                        <Clock size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Maturity</p>
                                                        <p className="text-sm font-black text-slate-900">{order.remainingDays}<span className="text-[10px] text-slate-400">/{order.contractPeriod}</span> <span className="text-[8px] text-slate-400 uppercase">Days</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Purchased</p>
                                                        <p className="text-[10px] font-black text-slate-600">{purchaseDate.toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-8 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                            <div
                                                className={`h-full transition-all duration-1000 ${order.status === 'active' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                style={{ width: `${Math.min(100, ((order.contractPeriod - order.remainingDays) / order.contractPeriod) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Edit Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !updating && setIsEditModalOpen(false)}></div>

                        <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="bg-indigo-600 px-8 py-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                        <Save size={20} />
                                    </div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Edit Order</h3>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (ETB)</label>
                                        <input
                                            type="number"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Income</label>
                                        <input
                                            type="number"
                                            value={editDailyIncome}
                                            onChange={(e) => setEditDailyIncome(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contract (Days)</label>
                                        <input
                                            type="number"
                                            value={editContract}
                                            onChange={(e) => setEditContract(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remaining Days</label>
                                        <input
                                            type="number"
                                            value={editRemainingDays}
                                            onChange={(e) => setEditRemainingDays(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <button
                                        onClick={handleUpdateOrder}
                                        disabled={updating}
                                        className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {updating ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Save size={18} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        disabled={updating}
                                        className="w-full h-14 bg-transparent text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
