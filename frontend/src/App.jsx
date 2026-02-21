import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Suspense, lazy, useEffect } from "react";
import { Loader2, User, LogOut, Sun, Moon } from "lucide-react";
import { useState } from "react";

// Theme initialization is now handled in the Layout component

// Lazy Load Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const GenerateExam = lazy(() => import("./pages/GenerateExam"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdultGames = lazy(() => import("./pages/AdultGames"));

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );
}

function Layout({ children }) {
    const { user, logout } = useAuth();
    useEffect(() => {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }, []);

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-700 relative overflow-hidden font-sans selection:bg-primary/30 selection:text-primary-700">
            {/* Premium Liquid Background Mesh */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-purple-500/20 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 animate-blob" />
                <div className="absolute top-[-10%] right-[-20%] w-[600px] h-[600px] bg-blue-500/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[20%] w-[700px] h-[700px] bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-[110px] opacity-40 animate-blob animation-delay-4000" />
                <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-[90px] opacity-30 animate-blob animation-delay-3000" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                <header className="px-8 py-5 flex justify-between items-center sticky top-6 mx-6 z-50 glass float-card border border-white/5">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 relative flex items-center justify-center">
                            {/* Mini Logo for Header */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full blur-md opacity-60" />
                            <img src="/images/logo.svg" alt="APEX Logo" className="w-full h-full object-contain relative z-10 drop-shadow-sm" />
                        </div>
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 dark:from-white dark:via-blue-100 dark:to-blue-200 tracking-tighter drop-shadow-sm">
                            APEX
                        </h1>
                    </div>
                    {/* Header Controls */}
                    <div className="flex items-center gap-4">
                        {/* Theme toggle removed to enforce Dark Mode exclusively */}
                        {user && (
                            <div className="flex items-center gap-3">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{user.full_name || "Scholar"}</p>
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-1">{user.institution || "Student"}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full glass border border-white/10 overflow-hidden relative group">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                            <User size={18} />
                                        </div>
                                    )}
                                </div>
                                <button onClick={logout} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Logout">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                <main className="container mx-auto p-8 flex-grow">
                    <Suspense fallback={<LoadingFallback />}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <Layout>
                    <Routes>
                        {/* Public routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/admin-login" element={<AdminLogin />} />

                        {/* Protected user routes */}
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/generate" element={<PrivateRoute><GenerateExam /></PrivateRoute>} />
                        <Route path="/history" element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
                        <Route path="/adult-games" element={<PrivateRoute><AdultGames /></PrivateRoute>} />

                        {/* Admin route — AdminPage has its own session gate */}
                        <Route path="/admin" element={<AdminPage />} />

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Layout>
            </AuthProvider>
        </Router>
    );
}

export default App;
