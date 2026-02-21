import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { History, FileText, Loader2, BookOpen, AlertCircle, Home, PlusCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function HistoryPage() {
    const { user } = useAuth();
    const location = useLocation();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get("/exams/history");
                setExams(res.data?.exams || []);
            } catch (err) {
                // If endpoint doesn't exist yet, show empty state gracefully
                if (err.response?.status === 404) {
                    setExams([]);
                } else {
                    setError("Could not load exam history.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="box max-w-4xl mx-auto space-y-8 pb-20 relative z-20">
            {/* Header */}
            <div className="glass p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-300 dark:to-indigo-300 tracking-tight">
                            History &amp; Archives
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
                            All your previously generated assessments.
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                        <History size={32} className="text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="glass p-16 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your archives...</p>
                </div>
            ) : error ? (
                <div className="glass p-10 text-center">
                    <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
                    <p className="text-red-500 font-semibold">{error}</p>
                </div>
            ) : exams.length === 0 ? (
                <div className="glass p-16 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <BookOpen size={40} className="text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">No Exams Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            Generate your first assessment to see it here.
                        </p>
                    </div>
                    <Link
                        to="/generate"
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Generate Now
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {exams.map((exam) => (
                        <div
                            key={exam.id}
                            className="glass p-6 float-card flex items-center justify-between gap-6 hover:border-blue-500/30 border border-transparent transition-all"
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex-shrink-0">
                                    <FileText size={24} className="text-blue-500" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-800 dark:text-white truncate">
                                        {exam.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {formatDate(exam.created_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                {exam.exam_type && (
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">
                                        {exam.exam_type}
                                    </span>
                                )}
                                {exam.difficulty && (
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${exam.difficulty === "Easy"
                                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                        : exam.difficulty === "Moderate"
                                            ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                                            : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                        }`}>
                                        {exam.difficulty}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Back to Dashboard */}
            <div className="flex justify-center">
                <Link
                    to="/"
                    className="px-6 py-3 glass border border-white/20 text-gray-300 font-semibold rounded-xl hover:border-blue-500/40 transition-all hover:scale-[1.02] flex items-center gap-2"
                >
                    <Home size={16} /> Back to Home
                </Link>
            </div>

            {/* Fixed Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
                <div className="max-w-md mx-auto glass border border-white/10 rounded-2xl px-2 py-2 flex justify-around items-center shadow-2xl shadow-black/40">
                    <Link
                        to="/"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <Home size={22} /> Home
                    </Link>
                    <Link
                        to="/generate"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/generate" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <PlusCircle size={22} /> Generate
                    </Link>
                    <Link
                        to="/history"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/history" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <History size={22} /> History
                    </Link>
                </div>
            </nav>
        </div>
    );
}
