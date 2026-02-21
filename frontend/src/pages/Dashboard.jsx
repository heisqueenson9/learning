import { Link, useLocation } from "react-router-dom";
import { FileText, History, LogOut, Shield, Home, PlusCircle, Flame } from "lucide-react";

export default function Dashboard() {
    const location = useLocation();

    return (
        <div className="box space-y-8 pb-20 relative z-20">

            {/* Welcome Header */}
            <div className="glass p-8 flex justify-between items-center relative overflow-hidden flex-wrap gap-4">
                <div className="relative z-10">
                    <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-blue-200 tracking-tight">
                        Welcome, Scholar
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium text-lg">
                        Your academic vault is active.
                    </p>
                </div>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Generate Exam Card */}
                <Link to="/generate" className="group p-10 glass bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-none float-card relative overflow-hidden">
                    {/* Shine effect */}
                    <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-white/20 transition-all duration-700" />

                    <div className="flex items-center justify-between text-white relative z-10">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <FileText size={42} className="opacity-90 drop-shadow-md" />
                        </div>
                        <span className="text-8xl font-black opacity-10 group-hover:opacity-20 transition-opacity tracking-tighter">01</span>
                    </div>
                    <div className="relative z-10 mt-8">
                        <h3 className="text-3xl font-bold text-white mb-2">Generate Exam</h3>
                        <p className="text-blue-100 font-medium text-lg leading-relaxed opacity-90">
                            Create quizzes, midsems, and finals instantly from topics or files.
                        </p>
                    </div>
                </Link>

                {/* History & Archives Card — now a proper Link */}
                <Link to="/history" className="p-10 glass float-card group cursor-pointer relative overflow-hidden block">
                    <div className="absolute top-[-50%] left-[-20%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />

                    <div className="flex items-center justify-between text-primary relative z-10">
                        <div className="p-4 bg-primary/5 rounded-2xl backdrop-blur-sm group-hover:bg-primary/10 transition-colors">
                            <History size={42} />
                        </div>
                        <span className="text-8xl font-black text-gray-200 dark:text-white/5 group-hover:text-primary/10 transition-colors tracking-tighter">02</span>
                    </div>
                    <div className="relative z-10 mt-8">
                        <h3 className="text-3xl font-bold dark:text-white mb-2 group-hover:text-primary transition-colors">
                            History &amp; Archives
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-lg leading-relaxed">
                            Access and review your previously generated assessments.
                        </p>
                    </div>
                </Link>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Adult Games Card */}
                <Link to="/adult-games" className="group p-8 glass bg-gradient-to-br from-rose-600/40 to-orange-700/40 hover:from-rose-600/60 hover:to-orange-700/60 border-rose-500/20 float-card relative overflow-hidden">
                    <div className="flex items-center justify-between text-white relative z-10">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Flame size={28} className="text-rose-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="relative z-10 mt-6">
                        <h3 className="text-xl font-bold text-white">Adult Games</h3>
                        <p className="text-rose-100 text-sm opacity-80 mt-1">Naughty truths and secrets vault (18+)</p>
                    </div>
                </Link>

                {/* Profile Settings Card */}
                <div className="p-8 glass float-card relative overflow-hidden flex flex-col justify-end bg-white/5 border-white/5 group">
                    <div className="absolute top-4 right-4 text-gray-500 group-hover:text-blue-400 transition-colors">
                        <User size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">My Profile</h3>
                    <p className="text-gray-400 text-sm mt-1">Manage your account and subscription</p>
                </div>

                {/* Admin Shortcut */}
                <Link to="/admin" className="p-8 glass border-orange-500/20 hover:border-orange-500/40 float-card relative overflow-hidden flex flex-col justify-end group">
                    <div className="absolute top-4 right-4 text-orange-500/40 group-hover:text-orange-500 transition-colors">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Admin Hub</h3>
                    <p className="text-gray-400 text-sm mt-1">Management and command center</p>
                </Link>
            </div>

            {/* ── Fixed Bottom Navigation Bar ───────────────────── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
                <div className="max-w-md mx-auto glass border border-white/10 rounded-2xl px-2 py-2 flex justify-around items-center shadow-2xl shadow-black/40">
                    <Link
                        to="/"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <Home size={22} />
                        Home
                    </Link>
                    <Link
                        to="/generate"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/generate" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <PlusCircle size={22} />
                        Generate
                    </Link>
                    <Link
                        to="/history"
                        className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/history" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <History size={22} />
                        History
                    </Link>
                </div>
            </nav>
        </div>
    );
}
