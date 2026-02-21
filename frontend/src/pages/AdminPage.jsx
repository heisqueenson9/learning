import React, { useState, useEffect } from "react";
import { Lock, Delete, Users, Shield, Calendar, Image as ImageIcon } from "lucide-react";

const ADMIN_PIN = "1010";

export default function AdminPage() {
    const [pin, setPin] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [payments, setPayments] = useState([]);
    const [gameAnswers, setGameAnswers] = useState([]);
    const [shake, setShake] = useState(false);

    const handlePinClick = (digit) => {
        setError("");
        if (pin.length < 4) {
            setPin((prev) => prev + digit);
        }
    };

    const handleDelete = () => {
        setError("");
        setPin((prev) => prev.slice(0, -1));
    };

    useEffect(() => {
        if (sessionStorage.getItem("apex_admin_auth") === "1") {
            handleLogin(true);
        }
    }, []);

    // Auto-check PIN when 4 digits are punched
    useEffect(() => {
        if (pin.length === 4) {
            handleLogin();
        }
    }, [pin]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleLogin = async (isAuto = false) => {
        if (!isAuto && pin !== ADMIN_PIN) {
            setError("Incorrect PIN. Access Denied.");
            triggerShake();
            setPin("");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const API = import.meta.env.VITE_API_URL || "/api/v1";
            const adminKey = sessionStorage.getItem("apex_admin_password") || "FlameFlame@99";
            const response = await fetch(`${API}/admin/payments`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey,
                },
            });

            if (response.status === 401 || response.status === 403) {
                // Ignore API backend if no connection or auth failure, since user requested local bypass
            }

            const gamesRes = await fetch(`${API}/admin/games`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": adminKey,
                },
            });

            if (!response.ok) {
                // Ignore other backend errors if no connection and just allow access to the empty state since local checking passed.
            } else {
                const data = await response.json();
                setPayments(data || []);
            }

            if (gamesRes.ok) {
                const gamesData = await gamesRes.json();
                setGameAnswers(gamesData || []);
            }
            setIsAuthenticated(true);
        } catch (err) {
            setIsAuthenticated(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePayment = async (id) => {
        if (!window.confirm("Are you sure you want to completely remove this user's access?")) return;
        try {
            const API = import.meta.env.VITE_API_URL || "/api/v1";
            const adminKey = sessionStorage.getItem("apex_admin_password") || "FlameFlame@99";
            const response = await fetch(`${API}/admin/payments/${id}`, {
                method: "DELETE",
                headers: {
                    "x-admin-key": adminKey,
                },
            });
            if (response.ok) {
                setPayments((prev) => prev.filter((p) => p.id !== id));
            } else {
                alert("Failed to remove user");
            }
        } catch (err) {
            console.error("Deletion error:", err);
            alert("Network error. Could not remove user.");
        }
    };

    if (!isAuthenticated) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-[70vh] ${shake ? "animate-shake" : ""}`}>
                <div className="max-w-sm w-full glass p-8 rounded-3xl border border-white/10 shadow-xl text-center">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-1">Restricted Area</h2>
                    <p className="text-sm text-gray-400 mb-6 font-medium tracking-wide">Enter the 4-digit Administration PIN.</p>

                    {/* PIN Visualizer */}
                    <div className="flex justify-center gap-3 mb-8">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? "bg-red-500 scale-110 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/10"}`}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 py-2 border border-red-500/20 rounded-lg mb-6 font-bold tracking-wide">
                            {error}
                        </div>
                    )}

                    {/* Numeric PIN Pad */}
                    <div className="grid grid-cols-3 gap-3 mb-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                disabled={loading}
                                onClick={() => handlePinClick(num.toString())}
                                className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-2xl font-black text-white transition-all active:scale-95"
                            >
                                {num}
                            </button>
                        ))}
                        <div className="h-16"></div>
                        <button
                            disabled={loading}
                            onClick={() => handlePinClick("0")}
                            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-2xl font-black text-white transition-all active:scale-95"
                        >
                            0
                        </button>
                        <button
                            disabled={loading}
                            onClick={handleDelete}
                            className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 text-white transition-all flex items-center justify-center active:scale-95 text-red-400 hover:text-red-300"
                        >
                            <Delete size={24} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Shield className="text-red-500" size={32} />
                        Payments Oversight
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-lg font-medium">
                        System-wide payment clearance matrix. Master logs for all uploaded screenshots and activation parameters.
                    </p>
                </div>
                <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border border-white/10 shrink-0">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold mb-1">TOTAL ENTRIES</p>
                        <p className="text-3xl font-black text-white leading-none">{payments.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Users size={20} className="text-white" />
                    </div>
                </div>
            </header>

            {/* List */}
            <div className="glass rounded-3xl border border-white/10 p-2 overflow-hidden bg-black/20">
                {payments.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center justify-center gap-4">
                        <div className="p-4 rounded-full bg-white/5 border border-white/10">
                            <ImageIcon size={32} className="text-gray-600" />
                        </div>
                        <p className="font-semibold tracking-wide">No payments logged currently.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest bg-white/[0.02]">
                                    <th className="py-5 pl-6 rounded-tl-xl">Student</th>
                                    <th className="py-5">Phone Entry</th>
                                    <th className="py-5">Access Record</th>
                                    <th className="py-5 text-center rounded-tr-xl">Receipt Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                                        <td className="py-5 pl-6">
                                            <p className="font-black text-white text-sm tracking-wide">{p.full_name}</p>
                                        </td>
                                        <td className="py-5 text-sm text-gray-300 font-mono tracking-wider">
                                            {p.phone}
                                        </td>
                                        <td className="py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                                                    <span className="text-gray-500 font-bold">Login:</span> {new Date(p.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                                                    {p.package || "Unknown Plan"}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-red-400">
                                                    <span className="text-red-500/70 font-bold">Due:</span> {p.due_date ? new Date(p.due_date).toLocaleDateString() : "N/A"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 text-center px-4">
                                            <div className="flex flex-col items-center gap-2">
                                                {p.screenshot_url ? (
                                                    <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/20 transition-all hover:scale-105">
                                                        <ImageIcon size={12} /> Evidence
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-500 tracking-wider">Missing Evidence</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Game Answers */}
            <header className="flex flex-col mt-12 mb-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Users className="text-red-500" size={24} />
                    Adult Games Responses
                </h2>
                <p className="text-gray-400 mt-2 text-sm font-medium">
                    Monitor users answering adult games questions. Total Responses: {gameAnswers.length}
                </p>
            </header>

            <div className="glass rounded-3xl border border-white/10 p-2 overflow-hidden bg-black/20">
                {gameAnswers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center justify-center gap-4">
                        <Users size={32} className="text-gray-600" />
                        <p className="font-semibold tracking-wide">No game answers logged yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest bg-white/[0.02]">
                                    <th className="py-5 pl-6 rounded-tl-xl w-1/4">Player</th>
                                    <th className="py-5 w-1/3">Question</th>
                                    <th className="py-5 w-1/3">Answer</th>
                                    <th className="py-5 text-center rounded-tr-xl">Log Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {gameAnswers.map((a) => (
                                    <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                                        <td className="py-5 pl-6">
                                            <p className="font-black text-white text-sm">{a.full_name}</p>
                                        </td>
                                        <td className="py-5 text-sm text-gray-300 font-medium">
                                            {a.question}
                                        </td>
                                        <td className="py-5 text-sm text-rose-300 italic">
                                            "{a.answer}"
                                        </td>
                                        <td className="py-5 text-center">
                                            <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
                                                <Calendar size={14} className="text-gray-500" />
                                                {new Date(a.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
