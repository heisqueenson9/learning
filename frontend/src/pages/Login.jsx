import { useState } from "react";
import { User, Phone, UploadCloud, CheckCircle, ArrowRight } from "lucide-react";

export default function Login() {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!fullName.trim() || !phone.trim() || !file) {
            return setError("Please fill in all fields and attach a screenshot.");
        }

        const formData = new FormData();
        formData.append("full_name", fullName.trim());
        formData.append("phone", phone.trim());
        formData.append("screenshot", file);

        setLoading(true);

        try {
            const API = import.meta.env.VITE_API_URL || "/api/v1";
            const response = await fetch(`${API}/upload-payment`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload payment. Please try again.");
            }

            setSuccess(true);
            setTimeout(() => {
                localStorage.setItem("accessGranted", "true");
                window.location.href = "/";
            }, 1500);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in-up">
            <div className="max-w-md w-full glass rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
                <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 text-center">
                    Activate Access
                </h2>
                <p className="text-gray-400 text-sm text-center mb-8">
                    Please submit your payment details to gain instant access.
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center mb-6 animate-shake">
                        {error}
                    </div>
                )}

                {!success ? (
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {/* Name Input */}
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Full Name"
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                            />
                        </div>

                        {/* Phone Input */}
                        <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone Number"
                                className="w-full bg-black/20 border border-white/5 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                            />
                        </div>

                        {/* File Upload */}
                        <div className="relative pt-2">
                            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-blue-500/40 bg-black/20'}`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <CheckCircle className="text-green-400 mb-2" size={32} />
                                    ) : (
                                        <UploadCloud className="text-gray-400 mb-2 group-hover:text-blue-400" size={32} />
                                    )}
                                    <p className="text-sm text-gray-300 font-medium">
                                        {file ? file.name : "Upload Payment Receipt"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Images only</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setFile(e.target.files[0])}
                                />
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? "Uploading..." : "Get Access"}
                                {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                            </span>
                        </button>
                    </form>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-fade-in">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="text-green-400" size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Access Granted!</h3>
                        <p className="text-gray-400">Loading your vault...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
