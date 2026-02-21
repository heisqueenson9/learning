import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Loader2, Lock, ArrowRight, CheckCircle,
    AlertCircle, User, Phone, Hash
} from "lucide-react";
import SuccessModal from "../components/common/SuccessModal";
import AdminLogin from "./AdminLogin";

const MIN_TXN_LEN = 16;

const INSTITUTION_TYPES = [
    { value: "University", label: "University", icon: "🎓" },
    { value: "SHS", label: "SHS", icon: "📚" },
    { value: "JHS", label: "JHS", icon: "📖" },
    { value: "Training College", label: "Training College", icon: "🏫" },
];

const PLANS = [
    {
        id: "weekly",
        name: "Weekly Pass",
        duration: "7 DAYS ACCESS",
        price: "GHS 20",
        color: "blue",
        border: "hover:border-blue-500/50",
        text: "text-blue-400",
    },
    {
        id: "monthly",
        name: "Monthly Elite",
        duration: "30 DAYS ACCESS",
        price: "GHS 50",
        color: "purple",
        border: "hover:border-purple-500/50",
        text: "text-purple-400",
    },
    {
        id: "quarterly",
        name: "Term Pass",
        duration: "90 DAYS ACCESS",
        price: "GHS 100",
        color: "green",
        border: "hover:border-green-500/50",
        text: "text-green-400",
    },
];

const slide = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.28 },
};

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Toggle for user/admin view in the same page
    const [isAdminMode, setIsAdminMode] = useState(searchParams.get("role") === "admin");

    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Step-3 form fields
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [institution, setInstitution] = useState("");
    const [phone, setPhone] = useState("");
    const [txnId, setTxnId] = useState("");
    const [txnError, setTxnError] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const handleTxnChange = (val) => {
        const digits = val.replace(/\D/g, "");
        setTxnId(digits);
        setTxnError(
            digits.length > 0 && digits.length < MIN_TXN_LEN
                ? `Need ${MIN_TXN_LEN - digits.length} more digit${MIN_TXN_LEN - digits.length !== 1 ? "s" : ""}`
                : ""
        );
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        const digitsPhone = phone.replace(/\D/g, "");

        if (!fullName.trim()) return setError("Please enter your full name.");
        if (!institution) return setError("Please select your institution type.");
        if (digitsPhone.length !== 10) return setError("Please enter exactly 10 phone number digits.");
        if (txnId.length < MIN_TXN_LEN) return setError(`Transaction ID must be exactly ${MIN_TXN_LEN} digits.`);

        setLoading(true);
        try {
            await login(phone.trim(), txnId, fullName, email, institution, "");
            setShowSuccess(true);
            setTimeout(() => navigate("/"), 2000);
        } catch (err) {
            setError(typeof err === "string" ? err : "Login failed. Check your Transaction ID.");
            setLoading(false);
        }
    };

    const txnProgress = Math.min((txnId.length / MIN_TXN_LEN) * 100, 100);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] relative z-20 px-4">
            <SuccessModal
                show={showSuccess}
                onClose={() => navigate("/")}
                score={100}
                title="Payment Verified ✅"
                message="Welcome to APEX. Loading your vault…"
            />

            <div className={`glass w-full max-w-md p-8 relative overflow-hidden transition-all duration-500`}>
                {/* Glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse pointer-events-none" />

                {/* Logo */}
                <div className="flex justify-center mb-8 relative z-10">
                    <div className="logo cursor-pointer hover:scale-105 transition-transform duration-300">
                        <img src="/images/logo.svg" alt="APEX Logo" />
                    </div>
                </div>

                <div className="flex justify-center mb-6 border-b border-white/10">
                    <button
                        onClick={() => setIsAdminMode(false)}
                        className={`pb-2 px-4 transition-colors font-bold ${!isAdminMode ? "text-primary border-b-2 border-primary" : "text-gray-500 hover:text-white"}`}
                    >
                        User Access
                    </button>
                    <button
                        onClick={() => setIsAdminMode(true)}
                        className={`pb-2 px-4 transition-colors font-bold ${isAdminMode ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-500 hover:text-white"}`}
                    >
                        Admin Login
                    </button>
                </div>

                <AnimatePresence mode="wait">

                    {isAdminMode ? (
                        <motion.div key="admin-step" {...slide}>
                            <AdminLogin isEmbedded={true} onBack={() => setIsAdminMode(false)} />
                        </motion.div>
                    ) : (
                        <>
                            {/* ═══════════════════════════════════════════════════════
                                STEP 1 — Choose Plan
                            ═══════════════════════════════════════════════════════ */}
                            {step === 1 && (
                                <motion.div key="step1" {...slide} className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300 mb-2">
                                            Choose Access
                                        </h2>
                                        <p className="text-gray-400 text-sm">
                                            Select a premium plan to unlock the vault.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {PLANS.map((plan) => (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan.id)}
                                                className={`group p-5 glass border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg dark:bg-black/20 ${selectedPlan === plan.id
                                                    ? plan.id === "weekly"
                                                        ? "border-blue-500/70 bg-blue-900/10"
                                                        : plan.id === "monthly"
                                                            ? "border-purple-500/70 bg-purple-900/10"
                                                            : "border-green-500/70 bg-green-900/10"
                                                    : `border-transparent ${plan.border}`
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h3 className={`font-bold text-lg ${plan.text} transition-colors`}>
                                                            {plan.name}
                                                        </h3>
                                                        <p className="text-gray-500 text-xs tracking-wider font-semibold">
                                                            {plan.duration}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="font-black text-2xl text-white">{plan.price}</p>
                                                        {selectedPlan === plan.id && (
                                                            <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                                    >
                                        Continue to Payment
                                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full text-sm text-gray-400 hover:text-primary transition-colors font-medium"
                                    >
                                        I already have a code
                                    </button>
                                </motion.div>
                            )}

                            {/* ═══════════════════════════════════════════════════════
                        STEP 2 — Payment Instructions
                    ═══════════════════════════════════════════════════════ */}
                            {step === 2 && (
                                <motion.div key="step2" {...slide} className="space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold text-white">Payment Details</h2>
                                        <p className="text-gray-500 text-sm mt-1">Secure your access via Telecel Cash</p>
                                    </div>

                                    {/* Telecel Cash box */}
                                    <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 p-6 rounded-2xl border border-yellow-700/30 text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500" />
                                        <p className="font-bold text-yellow-500 text-xs tracking-widest uppercase mb-1">
                                            Telecel Cash Number
                                        </p>
                                        <p className="text-3xl font-mono font-black text-white tracking-wider">
                                            0202979378
                                        </p>
                                        {selectedPlan && (
                                            <p className="mt-2 text-sm font-bold text-orange-400">
                                                Amount: {PLANS.find(p => p.id === selectedPlan)?.price}
                                            </p>
                                        )}
                                    </div>

                                    {/* Steps */}
                                    <div className="space-y-3 px-2">
                                        {[
                                            "Transfer the exact amount shown above",
                                            "Save the transaction receipt",
                                            "Enter your Transaction ID in the next step",
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                                                <div className="w-6 h-6 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                    {idx + 1}
                                                </div>
                                                {item}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => setStep(3)}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            I've Sent the Money →
                                        </button>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full py-3.5 glass border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            ← Back to Packages
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ═══════════════════════════════════════════════════════
                        STEP 3 — Verify Access (Full form)
                    ═══════════════════════════════════════════════════════ */}
                            {step === 3 && (
                                <motion.div key="step3" {...slide} className="space-y-5">
                                    <div className="text-center">
                                        <h2 className="text-2xl font-bold text-white">Verify Access</h2>
                                        <p className="text-gray-500 text-sm mt-1">
                                            Fill in your details to unlock the vault
                                        </p>
                                    </div>

                                    {/* Error */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3"
                                            >
                                                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-300 font-medium">{error}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleLogin} className="space-y-4">
                                        {/* Full Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                                                Full Name
                                            </label>
                                            <div className="relative">
                                                <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="e.g. Judah Elard"
                                                    className="glass-input w-full pl-10 pr-4 py-3.5 text-white placeholder:text-gray-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                                                Email
                                            </label>
                                            <div className="relative">
                                                <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="e.g. judah@example.com"
                                                    className="glass-input w-full pl-10 pr-4 py-3.5 text-white placeholder:text-gray-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Institution Type */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                                                Institution Type
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {INSTITUTION_TYPES.map((inst) => (
                                                    <button
                                                        key={inst.value}
                                                        type="button"
                                                        onClick={() => setInstitution(inst.value)}
                                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${institution === inst.value
                                                            ? "bg-blue-600/30 border-blue-500 text-blue-300"
                                                            : "bg-black/20 border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
                                                            }`}
                                                    >
                                                        <span>{inst.icon}</span>
                                                        <span className="text-xs font-semibold">{inst.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="0xxxxxxxxx"
                                                    className="glass-input w-full pl-10 pr-4 py-3.5 text-white placeholder:text-gray-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Transaction ID */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">
                                                Transaction ID
                                            </label>
                                            <div className="relative">
                                                <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={txnId}
                                                    onChange={(e) => handleTxnChange(e.target.value)}
                                                    placeholder="16-digit Transaction ID"
                                                    maxLength={16}
                                                    className={`glass-input w-full pl-10 pr-10 py-3.5 font-mono tracking-widest text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-600 ${txnId.length > 0
                                                        ? txnError ? "border-red-500/60" : "border-green-500/60"
                                                        : ""
                                                        }`}
                                                />
                                                {txnId.length >= MIN_TXN_LEN && (
                                                    <CheckCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                                )}
                                            </div>

                                            {/* Progress */}
                                            {txnId.length > 0 && (
                                                <div className="mt-1 space-y-1">
                                                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            style={{ width: `${txnProgress}%` }}
                                                            className={`h-full rounded-full transition-all duration-300 ${txnId.length >= MIN_TXN_LEN ? "bg-green-500" : "bg-yellow-500"}`}
                                                        />
                                                    </div>
                                                    <p className={`text-xs flex items-center gap-1 ${txnError ? "text-yellow-400" : "text-green-400"}`}>
                                                        {txnError
                                                            ? <><AlertCircle size={11} /> {txnError}</>
                                                            : <><CheckCircle size={11} /> ID looks good</>
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={loading || (txnId.length > 0 && !!txnError)}
                                            className="w-full mt-2 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-400 hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95 relative overflow-hidden group"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {loading
                                                    ? <><Loader2 className="animate-spin" size={18} /> Verifying…</>
                                                    : <>Unlock Vault <Lock size={16} /></>
                                                }
                                            </span>
                                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        </button>
                                    </form>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full py-3.5 glass border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            ← Back to Payment
                                        </button>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full py-3.5 glass border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-all text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            ← Packages
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                        </>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
