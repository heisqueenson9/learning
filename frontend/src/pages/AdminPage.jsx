import React, { useState, useEffect } from "react";
import { Lock, Search, Users, Shield, Calendar, Image as ImageIcon } from "lucide-react";

export default function AdminPage() {
    const [key, setKey] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [payments, setPayments] = useState([]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (key !== "FlameFlame@99") {
            setError("Invalid Admin Key.");
            setTimeout(() => window.location.href = "/", 1500);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const API = import.meta.env.VITE_API_URL || "/api/v1";
            const response = await fetch(`${API}/admin/payments`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-admin-key": key,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch payments or unauthorized.");
            }

            const data = await response.json();
            setPayments(data);
            setIsAuthenticated(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/10 shadow-xl text-center">
                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-2xl flex flex-col items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                    <p className="text-sm text-gray-400 mb-6">Enter the master administration key to continue.</p>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 py-2 px-4 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Terminal Key"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest focus:outline-none focus:border-red-500/50"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all ${loading ? 'opacity-50' : ''}`}
                        >
                            {loading ? "Decrypting..." : "Access Control Panel"}
                        </button>
                    </form>
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
                    <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-lg">
                        System-wide payment clearance matrix. Master logs for all uploaded screenshots and activation parameters.
                    </p>
                </div>
                <div className="glass px-6 py-4 rounded-2xl flex items-center gap-4 border border-white/10 shrink-0">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">TOTAL ENTRIES</p>
                        <p className="text-2xl font-black text-white">{payments.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <Users size={20} className="text-white" />
                    </div>
                </div>
            </header>

            {/* List */}
            <div className="glass rounded-3xl border border-white/10 p-6 overflow-hidden">
                {payments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        No payments logged currently.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-widest">
                                    <th className="pb-4 pl-4">Student</th>
                                    <th className="pb-4">Phone Entry</th>
                                    <th className="pb-4">Log Date</th>
                                    <th className="pb-4 text-center">Receipt Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 pl-4">
                                            <p className="font-bold font-mono text-white text-sm">{p.full_name}</p>
                                        </td>
                                        <td className="py-4 text-sm text-gray-300 font-mono tracking-wide">
                                            {p.phone}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Calendar size={14} className="text-indigo-400" />
                                                {new Date(p.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="py-4 text-center">
                                            {p.screenshot_url ? (
                                                <a href={p.screenshot_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-colors">
                                                    <ImageIcon size={14} /> Open Ledger
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-500">Missing Evidence</span>
                                            )}
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
