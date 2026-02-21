import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    User, Phone, Hash, GraduationCap, BookOpen, CheckCircle,
    AlertCircle, Loader2, ArrowRight, Shield
} from "lucide-react";

const MIN_TXN_LENGTH = 16; // e.g. "0000012137123017"

const INSTITUTION_TYPES = [
    { value: "University", label: "University", icon: "🎓" },
    { value: "SHS", label: "SHS (Senior High School)", icon: "📚" },
    { value: "JHS", label: "JHS (Junior High School)", icon: "📖" },
    { value: "Training College", label: "Training College", icon: "🏫" },
];

export default function Payment() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [institution, setInstitution] = useState("");
    const [phone, setPhone] = useState("");
    const [txnId, setTxnId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [txnError, setTxnError] = useState("");

    // Live Transaction ID validation
    const handleTxnChange = (val) => {
        // Only allow digits
        const digits = val.replace(/\D/g, "");
        setTxnId(digits);
        if (digits.length > 0 && digits.length < MIN_TXN_LENGTH) {
            setTxnError(`Transaction ID must be at least ${MIN_TXN_LENGTH} digits. You have ${digits.length}.`);
        } else {
            setTxnError("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Validate all fields
        if (!fullName.trim()) return setError("Please enter your full name.");
        if (!institution) return setError("Please select your institution type.");
        if (!phone.trim()) return setError("Please enter your phone number.");
        if (txnId.length < MIN_TXN_LENGTH) {
            return setError(`Transaction ID must be at least ${MIN_TXN_LENGTH} digits long.`);
        }

        setLoading(true);
        try {
            // login() sends phone + txnId to backend; any 16+ digit ID is accepted
            const ok = await login(phone.trim(), txnId, fullName.trim(), institution);
            if (ok) {
                navigate("/", { replace: true });
            } else {
                setError("Access denied. Please check your details and try again.");
            }
        } catch (err) {
            setError(typeof err === "string" ? err : "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const txnProgress = Math.min((txnId.length / MIN_TXN_LENGTH) * 100, 100);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            {/* Background blobs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-600/20 rounded-full filter blur-[120px] opacity-50 animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full filter blur-[100px] opacity-50 animate-blob animation-delay-2000" />
                <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-purple-600/10 rounded-full filter blur-[80px] opacity-40 animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Card */}
                <div className="glass p-8 space-y-6">

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-2">
                            <GraduationCap size={32} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Activate Access</h1>
                        <p className="text-gray-400 text-sm font-medium">
                            Enter your details and transaction ID to unlock APEX
                        </p>
                    </div>

                    {/* Security badge */}
                    <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-700/30 rounded-xl px-4 py-2.5">
                        <Shield size={14} className="text-blue-400 flex-shrink-0" />
                        <span className="text-xs text-blue-300 font-medium">
                            Your data is private and secured. No card required.
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Full Name
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Kwame Mensah"
                                    className="glass-input w-full pl-11 pr-4 py-3.5 text-white placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Institution Type */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Institution Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {INSTITUTION_TYPES.map((inst) => (
                                    <button
                                        key={inst.value}
                                        type="button"
                                        onClick={() => setInstitution(inst.value)}
                                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 text-left
                                            ${institution === inst.value
                                                ? "bg-blue-600/30 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10"
                                                : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                                            }`}
                                    >
                                        <span className="text-lg">{inst.icon}</span>
                                        <span className="leading-tight">{inst.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Phone Number
                            </label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="e.g. 0241234567"
                                    className="glass-input w-full pl-11 pr-4 py-3.5 text-white placeholder:text-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Transaction ID */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Transaction ID
                            </label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={txnId}
                                    onChange={(e) => handleTxnChange(e.target.value)}
                                    placeholder="16-digit transaction ID"
                                    className={`glass-input w-full pl-11 pr-11 py-3.5 font-mono tracking-widest text-white placeholder:text-gray-600 placeholder:font-sans placeholder:tracking-normal
                                        ${txnError ? "border-red-500/60 focus:ring-red-500" : txnId.length >= MIN_TXN_LENGTH ? "border-green-500/60 focus:ring-green-500" : ""}
                                    `}
                                    maxLength={30}
                                    required
                                />
                                {/* Valid check icon */}
                                {txnId.length >= MIN_TXN_LENGTH && (
                                    <CheckCircle size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                )}
                            </div>

                            {/* Progress bar */}
                            {txnId.length > 0 && (
                                <div className="space-y-1">
                                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${txnId.length >= MIN_TXN_LENGTH ? "bg-green-500" : "bg-yellow-500"}`}
                                            style={{ width: `${txnProgress}%` }}
                                        />
                                    </div>
                                    {txnError ? (
                                        <p className="text-xs text-red-400 flex items-center gap-1">
                                            <AlertCircle size={12} /> {txnError}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <CheckCircle size={12} /> Transaction ID looks good
                                        </p>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-gray-600 mt-1">
                                Minimum {MIN_TXN_LENGTH} digits required · Only digits are accepted
                            </p>
                        </div>

                        {/* Global error */}
                        {error && (
                            <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 animate-scale-in">
                                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !!txnError}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <><Loader2 size={20} className="animate-spin" /> Verifying Access...</>
                            ) : (
                                <>Activate My Access <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    {/* Footer note */}
                    <p className="text-center text-xs text-gray-600">
                        Already activated?{" "}
                        <a href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Go to Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
