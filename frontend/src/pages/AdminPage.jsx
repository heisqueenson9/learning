import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import {
    Users, CreditCard, RefreshCw, CheckCircle, XCircle,
    Shield, Clock, Loader2, AlertTriangle, Plus,
    Lock, Eye, EyeOff, LogOut, Phone, KeyRound,
    Search, Flame
} from "lucide-react";

// ─── Admin credentials are stored in sessionStorage by AdminLogin ─────────────
const getAdminHeaders = () => ({
    "X-Admin-Phone": sessionStorage.getItem("apex_admin_phone") || "",
    "X-Admin-Password": sessionStorage.getItem("apex_admin_password") || "",
});
// ─────────────────────────────────────────────────────────────────────────────

// ─── Main Admin Panel ──────────────────────────────────────────────────────────
export default function AdminPage() {
    const [authed, setAuthed] = useState(false);
    const [tab, setTab] = useState("users");
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [gameLogs, setGameLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Add TXN form
    const [newTxnId, setNewTxnId] = useState("");
    const [newTxnAmount, setNewTxnAmount] = useState("");
    const [txnMsg, setTxnMsg] = useState({ text: "", type: "" });
    const [addingTxn, setAddingTxn] = useState(false);

    // Check session on mount (persists across hot-reloads but NOT across tab close)
    useEffect(() => {
        if (sessionStorage.getItem("apex_admin_auth") === "1") setAuthed(true);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem("apex_admin_auth");
        sessionStorage.removeItem("apex_admin_phone");
        sessionStorage.removeItem("apex_admin_password");
        setAuthed(false);
    };

    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const [usersRes, txnRes, gameLogsRes] = await Promise.all([
                api.get("/payments/admin/users", { headers: getAdminHeaders() }),
                api.get("/payments/admin/transactions", { headers: getAdminHeaders() }),
                api.get("/payments/admin/adult-game-logs", { headers: getAdminHeaders() }),
            ]);
            setUsers(usersRes.data?.users || []);
            setTransactions(txnRes.data?.transactions || []);
            setGameLogs(gameLogsRes.data || []);
        } catch (err) {
            setError(err.response?.status === 403
                ? "Access denied. Admin privileges required."
                : "Failed to load admin data."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authed) loadData();
    }, [authed]);

    const handleAddTxn = async (e) => {
        e.preventDefault();
        if (!newTxnId || !newTxnAmount) return;
        setAddingTxn(true);
        setTxnMsg({ text: "", type: "" });
        try {
            const res = await api.post(
                `/payments/add-dev-txn?txn_id=${encodeURIComponent(newTxnId)}&amount=${newTxnAmount}`,
                null,
                { headers: getAdminHeaders() }
            );
            if (res.data?.error) {
                setTxnMsg({ text: res.data.error, type: "error" });
            } else if (res.data?.status === "exists") {
                setTxnMsg({ text: "Transaction ID already exists.", type: "warning" });
            } else {
                setTxnMsg({ text: `Transaction "${newTxnId}" added (GHS ${newTxnAmount}).`, type: "success" });
                setNewTxnId("");
                setNewTxnAmount("");
                loadData();
            }
        } catch {
            setTxnMsg({ text: "Failed to add transaction.", type: "error" });
        } finally {
            setAddingTxn(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
        });
    };

    // ── Filter Data ──────────────────────────────────────────────────────────
    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone_number?.includes(searchQuery) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTransactions = transactions.filter(t =>
        t.txn_id_hash?.includes(searchQuery) ||
        t.used_by_phone?.includes(searchQuery)
    );

    const filteredGameLogs = gameLogs.filter(l =>
        l.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.user_phone?.includes(searchQuery) ||
        l.game_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── NOT authenticated → redirect to login ──────────────────────────────────
    if (!authed) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
                <Shield size={64} className="text-orange-500 animate-pulse" />
                <div className="text-center">
                    <h2 className="text-2xl font-black text-white">Admin Authentication Required</h2>
                    <p className="text-gray-400 mt-2">Please authenticate to access the command center.</p>
                </div>
                <button
                    onClick={() => window.location.href = "/login?role=admin"}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105"
                >
                    Go to Admin Login
                </button>
            </div>
        );
    }

    // ── Authenticated → show full panel ──────────────────────────────────────
    return (
        <div className="box max-w-5xl mx-auto space-y-8 pb-20 relative z-20">

            {/* Header */}
            <div className="glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-900/20 rounded-2xl">
                            <Shield size={32} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                                Admin Panel
                            </h2>
                            <p className="text-gray-400 text-sm mt-0.5 font-medium">
                                Manage users, subscriptions &amp; transactions
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 glass border border-white/10 text-sm font-semibold rounded-xl hover:border-blue-400/40 transition-all disabled:opacity-50 text-gray-300"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 glass border border-red-500/30 text-red-400 hover:border-red-400/60 text-sm font-semibold rounded-xl transition-all"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="glass p-6 border border-red-800 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                    <p className="text-red-400 font-medium">{error}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 flex flex-col bg-black/20 p-1.5 rounded-2xl border border-white/10">
                    {[
                        { id: "users", label: "Users", icon: Users },
                        { id: "transactions", label: "Transactions", icon: CreditCard },
                        { id: "game_logs", label: "Adult Games", icon: Eye },
                        { id: "add_txn", label: "Add Transaction", icon: Plus },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => { setTab(id); setSearchQuery(""); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${tab === id
                                ? "text-white shadow-sm bg-primary/20"
                                : "text-gray-500 hover:text-gray-200"
                                }`}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>
                <div className="md:col-span-3 glass p-1 flex items-center gap-1 rounded-2xl overflow-hidden shadow-lg border border-white/5 relative bg-white/5 backdrop-blur-3xl">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder={`Search ${tab === 'users' ? 'scholars...' : tab === 'transactions' ? 'TXN IDs' : 'activity...'}`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-white pl-14 pr-6 py-4 focus:ring-0 placeholder:text-gray-600 font-medium"
                    />
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-2xl bg-blue-500/5 border-blue-500/10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Users</p>
                    <p className="text-2xl font-black text-white mt-1">{users.length}</p>
                </div>
                <div className="glass p-4 rounded-2xl bg-green-500/5 border-green-500/10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Users</p>
                    <p className="text-2xl font-black text-white mt-1">{users.filter(u => u.is_active).length}</p>
                </div>
                <div className="glass p-4 rounded-2xl bg-purple-500/5 border-purple-500/10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Used TXNs</p>
                    <p className="text-2xl font-black text-white mt-1">{transactions.filter(t => t.is_used).length}</p>
                </div>
                <div className="glass p-4 rounded-2xl bg-orange-500/5 border-orange-500/10">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Game Logs</p>
                    <p className="text-2xl font-black text-white mt-1">{gameLogs.length}</p>
                </div>
            </div>

            {/* Tab Content */}
            <div className="relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass p-16 flex flex-col items-center gap-4">
                            <Loader2 className="animate-spin text-orange-500" size={40} />
                            <p className="text-gray-500 font-medium tracking-wide">Synchronising data...</p>
                        </motion.div>
                    ) : tab === "users" ? (
                        <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-6 space-y-4 shadow-2xl">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                    <Users size={20} className="text-blue-400" /> Scholar Database ({filteredUsers.length})
                                </h3>
                                {searchQuery && <p className="text-xs text-gray-500">Filtered results</p>}
                            </div>
                            <div className="overflow-x-auto rounded-xl">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 bg-white/5">
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">User Profile</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Institution</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Status</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Expiry</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Days Left</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                                                            {u.full_name?.charAt(0) || "U"}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white leading-none mb-1">{u.full_name || "Scholar"}</span>
                                                            <span className="text-xs text-gray-500 font-mono tracking-tighter">{u.phone_number}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-gray-400 text-xs font-semibold">{u.institution || "—"}</td>
                                                <td className="py-4 px-4">
                                                    {u.is_active ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                                                            <CheckCircle size={10} /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                                                            <XCircle size={10} /> Expired
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-gray-300 text-xs font-medium">{formatDate(u.expiry_date)}</td>
                                                <td className="py-4 px-4 text-right">
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${u.days_remaining > 5
                                                        ? "text-green-400"
                                                        : u.days_remaining > 0
                                                            ? "text-yellow-400"
                                                            : "text-red-400"
                                                        }`}>
                                                        {u.days_remaining}d
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : tab === "transactions" ? (
                        <motion.div key="txns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-6 space-y-4">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2 px-2">
                                <CreditCard size={20} className="text-purple-400" /> Transactions ({filteredTransactions.length})
                            </h3>
                            <div className="overflow-x-auto rounded-xl">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 bg-white/5">
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">TXN Hash / ID</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Amount</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Usage Status</th>
                                            <th className="text-left py-4 px-4 font-bold text-gray-400">Owner Phone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.map((t) => (
                                            <tr key={t.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-4 font-mono text-gray-300 tracking-tighter text-xs">{t.txn_id_hash}</td>
                                                <td className="py-4 px-4 font-black text-white">GHS {t.amount}</td>
                                                <td className="py-4 px-4">
                                                    {t.is_used ? (
                                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-tight flex items-center gap-1">
                                                            <CheckCircle size={12} className="text-blue-500" /> Used
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-400 text-xs font-bold uppercase tracking-tight flex items-center gap-1">
                                                            <Clock size={12} /> Available
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-xs font-mono text-gray-400">{t.used_by_phone || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : tab === "game_logs" ? (
                        <motion.div key="logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass p-6 space-y-4">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2 px-2">
                                <Eye size={20} className="text-rose-400" /> Adult Game Logs ({filteredGameLogs.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredGameLogs.map((log) => (
                                    <div key={log.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                                            <Flame size={40} className="text-rose-500" />
                                        </div>
                                        <div className="flex justify-between items-start pt-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase text-gray-500 tracking-widest">{log.game_title}</span>
                                                <span className="font-bold text-white text-sm">{log.user_name || "User"} ({log.user_phone})</span>
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-600 uppercase">{formatDate(log.played_at)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-400 italic">" {log.question} "</p>
                                            <p className="text-sm text-green-400 font-bold ml-4">↳ {log.answer}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : tab === "add_txn" ? (
                        <motion.div key="add" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass p-10 max-w-md mx-auto space-y-8 bg-gradient-to-br from-orange-500/5 to-transparent">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Plus size={32} className="text-orange-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white">Manual Injection</h3>
                                <p className="text-gray-400 text-sm mt-1">Pre-verify a Transaction ID for a specific scholar.</p>
                            </div>

                            {txnMsg.text && (
                                <div className={`p-4 rounded-xl text-xs font-bold text-center border animate-pulse ${txnMsg.type === "success"
                                    ? "bg-green-500/10 border-green-500/40 text-green-400"
                                    : txnMsg.type === "warning"
                                        ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
                                        : "bg-red-500/10 border-red-500/40 text-red-400"
                                    }`}>
                                    {txnMsg.text}
                                </div>
                            )}

                            <form onSubmit={handleAddTxn} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-[0.2em]">Transaction ID hash</label>
                                    <input type="text" value={newTxnId} onChange={(e) => setNewTxnId(e.target.value)} className="glass-input w-full p-4 text-white font-mono" placeholder="e.g. 0000012137123017" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-[0.2em]">Amount paid (GHS)</label>
                                    <input type="number" value={newTxnAmount} onChange={(e) => setNewTxnAmount(e.target.value)} className="glass-input w-full p-4 text-white" placeholder="15, 50, 100..." min="1" required />
                                </div>
                                <button type="submit" disabled={addingTxn} className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50">
                                    {addingTxn ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Inject Record"}
                                </button>
                            </form>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}
