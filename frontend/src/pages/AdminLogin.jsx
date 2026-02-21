import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Shield, Phone, KeyRound, Eye, EyeOff,
    AlertCircle, Loader2, ArrowLeft
} from "lucide-react";
import api from "../services/api";

export default function AdminLogin({ isEmbedded = false, onBack = null }) {
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [shaking, setShaking] = useState(false);

    const shake = () => {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Strict hardcoded validation as requested
        if (phone.trim() !== "0202979378" || password !== "FlameFlame@99") {
            setError("Invalid admin credentials. Access denied.");
            shake();
            setLoading(false);
            return;
        }

        try {
            // Validate credentials against the backend admin endpoint directly
            await api.get("/payments/admin/users", {
                headers: {
                    "X-Admin-Phone": phone.trim(),
                    "X-Admin-Password": password,
                },
            });
            // If we reach here, credentials are valid
            sessionStorage.setItem("apex_admin_auth", "1");
            sessionStorage.setItem("apex_admin_phone", phone.trim());
            sessionStorage.setItem("apex_admin_password", password);
            navigate("/admin");
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (err.response?.status === 403) {
                setError("Invalid admin credentials. Access denied.");
            } else if (!err.response) {
                setError("Cannot reach server. Make sure the backend is running.");
            } else {
                setError(detail || "Authentication failed. Please try again.");
            }
            shake();
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <>
            <style>{`
                @keyframes shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-8px)}
                    40%{transform:translateX(8px)}
                    60%{transform:translateX(-5px)}
                    80%{transform:translateX(5px)}
                }
                .shake { animation: shake 0.45s ease; }
            `}</style>

            <div className={`glass w-full max-w-sm p-8 relative overflow-hidden ${shaking ? "shake" : ""}`}>
                {/* Glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Back to user login */}
                {!isEmbedded && (
                    <Link
                        to="/login"
                        className="w-full flex items-center justify-center gap-2 py-3 mb-5 glass border border-white/15 hover:border-blue-500/40 text-gray-300 hover:text-white transition-all rounded-xl text-sm font-semibold"
                    >
                        <ArrowLeft size={15} /> Back to User Login
                    </Link>
                )}

                {/* Header */}
                <div className="text-center space-y-3 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30">
                        <Shield size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">Admin Login</h2>
                        <p className="text-xs text-gray-400 font-medium mt-1">
                            Restricted area — authorised personnel only
                        </p>
                    </div>
                </div>

                {/* Warning badge */}
                <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-700/30 rounded-xl px-4 py-2.5 mb-6">
                    <Shield size={12} className="text-orange-400 flex-shrink-0" />
                    <span className="text-xs text-orange-300 font-medium">
                        All access attempts are monitored and logged.
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Admin Phone
                        </label>
                        <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Admin phone number"
                                autoComplete="off"
                                className="glass-input w-full pl-10 pr-4 py-3.5 text-white placeholder:text-gray-600 font-mono"
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Password
                        </label>
                        <div className="relative">
                            <KeyRound size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type={showPw ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Admin password"
                                autoComplete="current-password"
                                className="glass-input w-full pl-10 pr-12 py-3.5 text-white placeholder:text-gray-600"
                                required
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3">
                            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading
                            ? <><Loader2 size={18} className="animate-spin" /> Authenticating…</>
                            : <><Shield size={16} /> Access Admin Panel</>
                        }
                    </button>
                </form>

                <p className="text-center text-[11px] text-gray-700 mt-4">
                    Unauthorised access attempts are logged.
                </p>
            </div>
        </>
    );

    return isEmbedded ? (
        <div className="w-full flex justify-center">
            {content}
        </div>
    ) : (
        <div className="flex flex-col items-center justify-center min-h-[80vh] relative z-20 px-4">
            {content}
        </div>
    );
}
