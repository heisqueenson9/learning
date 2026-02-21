import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { File as FileIcon, Loader2, Settings, BookOpen, FileText, CheckCircle, X, Check, RotateCcw, Clock, Trophy, AlertCircle, AlertTriangle, Cpu, Home, BarChart2, Save, PlusCircle, History } from "lucide-react";
import confetti from "canvas-confetti";
import SuccessModal from "../components/common/SuccessModal";

export default function GenerateExam() {
    useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState("topic"); // topic or file
    const [topic, setTopic] = useState("");
    const [file, setFile] = useState(null);
    const [level, setLevel] = useState("Level 200");
    const [type, setType] = useState("IA");
    const [difficulty, setDifficulty] = useState("Moderate");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [retryCount, setRetryCount] = useState(0);

    // Quiz State
    const [quizData, setQuizData] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // AI model status
    const [aiStatus, setAiStatus] = useState({ mode: "loading", ready: false });
    const aiPollRef = useRef(null);

    useEffect(() => {
        const checkAI = async () => {
            try {
                const res = await api.get("/ai-status");
                setAiStatus(res.data);
                // Stop polling once model is fully ready or permanently failed
                if (res.data.ready || res.data.failed) {
                    clearInterval(aiPollRef.current);
                }
            } catch {
                setAiStatus({ mode: "mock", ready: false, failed: false });
            }
        };
        checkAI(); // immediate
        aiPollRef.current = setInterval(checkAI, 8000); // poll every 8s
        return () => clearInterval(aiPollRef.current);
    }, []);

    const MAX_FILE_SIZE_MB = 20;
    const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt", ".pptx"];

    const handleFileChange = (e) => {
        setError("");
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];

            // Validate File Size
            if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
                return;
            }

            // Validate Extension
            const extension = "." + selectedFile.name.split(".").pop().toLowerCase();
            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                setError("Unsupported file format. Please upload PDF, DOCX, TXT, or PPTX.");
                return;
            }

            setFile(selectedFile);
        }
    };

    const triggerConfetti = () => {
        const end = Date.now() + 3 * 1000;
        const colors = ["#2563eb", "#ffffff", "#FFD700"];

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors,
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    };

    const generateWithRetry = async (formData, attempts = 2) => {
        try {
            const res = await api.post("/exams/generate", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 300000 // 5 minutes for AI generation
            });
            return res.data;
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (err.code === "ECONNABORTED") {
                setError("AI Generation timed out. The server is still processing; please check your history in a few minutes.");
            } else {
                setError(detail || err.message || "Failed to generate exam. The AI engine might be warming up.");
            }
            if (attempts > 0) {
                console.log(`Retrying generation... Attempts left: ${attempts}`);
                setRetryCount((prev) => prev + 1);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return generateWithRetry(formData, attempts - 1);
            } else {
                throw err;
            }
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError("");
        setQuizData(null);
        setScore(null);
        setRetryCount(0);
        setUserAnswers({});
        setIsActive(false);

        const formData = new FormData();
        formData.append("level", level);
        formData.append("exam_type", type);
        formData.append("difficulty", difficulty);

        if (mode === "topic") {
            if (!topic) {
                setError("Topic is required");
                setLoading(false);
                return;
            }
            formData.append("topic", topic);
        } else {
            if (!file) {
                setError("Please select a file to upload.");
                setLoading(false);
                return;
            }
            formData.append("file", file);
        }

        try {
            const data = await generateWithRetry(formData);

            // Parse JSON Content
            let parsedQuestions;
            try {
                // The backend returns { ... questions: "JSON_STRING" }
                // OR checking if it returns raw text if AI failed to JSONify
                const content = data.questions;
                if (typeof content === 'object') {
                    parsedQuestions = content;
                } else {
                    // Try to clean markdown code blocks if present // ```json ... ```
                    const cleanedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
                    parsedQuestions = JSON.parse(cleanedContent);
                }
            } catch (jsonErr) {
                console.warn("Parsing Error", jsonErr);
                setError("Received invalid quiz format. Please try again or use a simpler topic.");
                setLoading(false);
                return;
            }

            if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
                setError("Invalid question format received.");
                setLoading(false);
                return;
            }

            setQuizData(parsedQuestions);
            setTimeLeft(parsedQuestions.questions.length * 60); // 1 min per question
            setIsActive(true);

        } catch (err) {
            console.error("Generation failed full error:", err);
            let message = "Generation failed. Please try again.";

            if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
                message = "The request timed out. The server is taking longer than expected. Please try uploading a smaller file or try again.";
            } else if (err.response) {
                // If backend sent a comprehensive error
                message = err.response.data?.detail || `Server Error (${err.response.status}): ${err.response.statusText}`;
            } else if (err.request) {
                // Request made but no response received
                message = "Network Error: No response from server. Please check your connection.";
            } else {
                message = err.message || "An unexpected error occurred.";
            }

            setError(message);
        } finally {
            setLoading(false);
            setRetryCount(0);
        }
    };

    // Timer Effect — tick every second while active
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    // Time-up detection — auto-submit when timeLeft hits 0
    useEffect(() => {
        if (!isActive || timeLeft > 0 || score !== null) return;
        // Time's up
        setIsActive(false);
        if (quizData) {
            let correctCount = 0;
            quizData.questions.forEach((q) => {
                if (userAnswers[q.id]?.trim() === q.answer?.trim()) {
                    correctCount++;
                }
            });
            const finalScore = Math.round((correctCount / quizData.questions.length) * 100);
            setScore(finalScore);
            if (finalScore >= 50) {
                triggerConfetti();
                setShowSuccessModal(true);
            }
        }
    }, [timeLeft, isActive, quizData, userAnswers, score]);

    const handleAnswerSelect = (questionId, option) => {
        if (score !== null) return; // Disable changes after submission
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: option
        }));
    };

    const handleSubmitQuiz = () => {
        if (!quizData) return;
        setIsActive(false);
        let correctCount = 0;
        quizData.questions.forEach(q => {
            // Flexible comparison (trim spaces)
            if (userAnswers[q.id]?.trim() === q.answer?.trim()) {
                correctCount++;
            }
        });
        const finalScore = Math.round((correctCount / quizData.questions.length) * 100);
        setScore(finalScore);
        if (finalScore >= 50) {
            triggerConfetti();
            setShowSuccessModal(true);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <>
            <div className="box max-w-4xl mx-auto space-y-8 pb-32 relative z-20">
                <SuccessModal
                    show={showSuccessModal}
                    onClose={() => setShowSuccessModal(false)}
                    score={score ?? 0}
                    title={(score ?? 0) >= 80 ? "Outstanding! 🏆" : "Well Done! 🎉"}
                    message={undefined}
                />

                {!quizData ? (
                    /* Assessment Input Form */
                    <div className="glass p-8 relative overflow-hidden transition-all duration-300">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                        <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-white dark:to-blue-200 mb-3 relative z-10">Create Assessment</h2>

                        {/* AI Status Badge */}
                        <div className="flex items-center gap-2 mb-6 relative z-10">
                            <Cpu size={14} className={aiStatus.ready ? "text-green-500" : aiStatus.failed ? "text-gray-400" : "text-yellow-500"} />
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${aiStatus.ready ? "text-green-500" : aiStatus.failed ? "text-gray-500" : "text-yellow-500"}`}>
                                {aiStatus.ready ? "NVIDIA L4 ENGINE READY" : aiStatus.failed ? "SMART MOCK ENGINE" : "WARMING UP ENGINE"}
                            </span>
                            {!aiStatus.ready && !aiStatus.failed && <Loader2 className="animate-spin text-gray-600" size={10} />}
                        </div>

                        {/* Mode Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button
                                onClick={() => setMode("topic")}
                                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all group ${mode === "topic" ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" : "glass border-transparent hover:border-white/20 text-gray-500 hover:text-gray-300"}`}
                            >
                                <Settings size={28} className={mode === "topic" ? "animate-spin-slow" : ""} />
                                <span className="font-bold text-sm">By Topic</span>
                            </button>
                            <button
                                onClick={() => setMode("file")}
                                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all group ${mode === "file" ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" : "glass border-transparent hover:border-white/20 text-gray-500 hover:text-gray-300"}`}
                            >
                                <FileIcon size={28} className={mode === "file" ? "animate-bounce" : ""} />
                                <span className="font-bold text-sm">Upload File</span>
                            </button>
                        </div>

                        <form onSubmit={handleGenerate} className="space-y-6">
                            {mode === "topic" ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-widest">Topic or Prompt</label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="e.g. Constitutional Law, Biochemistry, Quantum Physics..."
                                            className="glass-input pl-12"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-widest">Upload Resource</label>
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-primary/50 transition-all group cursor-pointer bg-white/5" onClick={() => document.getElementById('file-upload').click()}>
                                        <input
                                            id="file-upload"
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.docx,.pptx,.txt"
                                            onChange={handleFileChange}
                                        />
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                                <FileIcon size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-300">{file ? file.name : "Drop file or click to browse"}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Max 20MB • PDF, Word, PowerPoint</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Academic Level</label>
                                    <select className="glass-input font-bold appearance-none bg-dark-surface/50" value={level} onChange={(e) => setLevel(e.target.value)}>
                                        <option value="Level 100">Level 100</option>
                                        <option value="Level 200">Level 200</option>
                                        <option value="Level 300">Level 300</option>
                                        <option value="Level 400">Level 400</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Exam Type</label>
                                    <select className="glass-input font-bold appearance-none bg-dark-surface/50" value={type} onChange={(e) => setType(e.target.value)}>
                                        <option value="IA">IA</option>
                                        <option value="Mid-Sem">Mid-Sem</option>
                                        <option value="Final Exam">Final Exam</option>
                                        <option value="Revision Quiz">Revision Quiz</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 ml-1">Rigour</label>
                                    <select className="glass-input font-bold appearance-none bg-dark-surface/50" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                                        <option value="Gentle">Gentle</option>
                                        <option value="Moderate">Moderate</option>
                                        <option value="Advanced">Advanced</option>
                                        <option value="Genius Only">Genius Only</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || (!topic && !file)}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-98 relative overflow-hidden group disabled:opacity-50"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            {retryCount > 0 ? `Retrying... (${retryCount})` : "Synthesising Assessment..."}
                                        </>
                                    ) : (
                                        <>
                                            Generate Assessment <FileText size={18} />
                                        </>
                                    )}
                                </span>
                            </button>
                        </form>
                    </div>
                ) : score === null ? (
                    /* Assessment Session */
                    <div className="space-y-8 animate-scale-in">
                        <div className="flex justify-between items-center glass p-6 sticky top-24 z-30 border border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-primary/70 uppercase">Time Remaining</p>
                                    <p className={`text-2xl font-black ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-white"}`}>{formatTime(timeLeft)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (window.confirm("End the exam and view your score?")) handleSubmitQuiz(); }}
                                className="px-6 py-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 font-bold rounded-xl transition-all"
                            >
                                End Session
                            </button>
                        </div>

                        <div className="space-y-6">
                            {quizData.questions.map((q, idx) => (
                                <div key={q.id} className="glass p-8 space-y-6 border-white/5">
                                    <div className="flex gap-4">
                                        <span className="text-4xl font-black text-white/10">{idx + 1}</span>
                                        <h3 className="text-xl font-bold text-white mt-1">{q.question}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-10">
                                        {q.options.map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => handleAnswerSelect(q.id, opt)}
                                                className={`p-4 rounded-xl border-2 text-left transition-all font-medium ${userAnswers[q.id] === opt ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/10" : "bg-white/5 border-transparent hover:border-white/20 text-gray-400 hover:text-white"}`}
                                            >
                                                <span className="mr-3 font-black text-primary">—</span> {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={handleSubmitQuiz}
                                className="w-full py-6 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-green-600/20 hover:scale-[1.02] active:scale-98 transition-all"
                            >
                                Submit & View Score
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Assessment Results View */
                    <div className="space-y-8 animate-scale-in">
                        <div className="glass p-12 text-center space-y-8 relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-2 ${score >= 50 ? "bg-green-500" : "bg-red-500"}`}></div>
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto relative z-10">
                                {score >= 50 ? <Trophy className="text-yellow-500" size={48} /> : <AlertTriangle className="text-red-500" size={48} />}
                            </div>
                            <div className="space-y-2 relative z-10">
                                <h3 className="text-xl font-bold text-gray-400">Assessment Complete</h3>
                                <h2 className="text-6xl font-black text-white">{score}%</h2>
                                <p className={`text-lg font-bold ${score >= 50 ? "text-green-400" : "text-red-400"}`}>
                                    {score >= 50 ? "EXCELLENT WORK SCHOLAR" : "NEEDS IMPROVEMENT"}
                                </p>
                            </div>

                            <div className="flex justify-center gap-8 relative z-10">
                                <div className="text-left pr-8 border-r border-white/10">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Your Score</p>
                                    <p className={`text-4xl font-black ${score >= 50 ? "text-green-400" : "text-red-400"}`}>{score}%</p>
                                </div>
                                <div className="text-left ml-4 pl-4 border-l border-white/10">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Pass Mark</p>
                                    <p className="text-2xl font-black text-gray-300">50%</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-3 relative z-10">
                                <button
                                    onClick={() => navigate("/")}
                                    className="flex items-center gap-2 px-5 py-3 glass border border-white/10 text-gray-300 hover:text-white hover:border-white/30 font-semibold rounded-xl transition-all"
                                >
                                    <Home size={16} /> Home
                                </button>
                                <button
                                    onClick={() => { setQuizData(null); setScore(null); setUserAnswers({}); setShowSuccessModal(false); }}
                                    className="flex items-center gap-2 px-5 py-3 glass border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-400/50 font-semibold rounded-xl transition-all"
                                >
                                    <FileText size={16} /> New Assessment
                                </button>
                                <button
                                    onClick={() => { setScore(null); setUserAnswers({}); setShowSuccessModal(false); setTimeLeft(quizData.questions.length * 60); setIsActive(true); }}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    <RotateCcw size={16} /> Retake Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="glass p-6 border-red-500/30 flex items-center gap-4 animate-scale-in">
                        <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-400">Generation Interrupted</p>
                            <p className="text-xs text-red-300/70 mt-0.5">{error}</p>
                        </div>
                        <button onClick={() => setError("")} className="ml-auto p-2 text-red-400/50 hover:text-red-400 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
                <div className="max-w-md mx-auto glass border border-white/10 rounded-2xl px-2 py-2 flex justify-around items-center shadow-2xl shadow-black/40">
                    <Link to="/" className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"}`}>
                        <Home size={22} /> Home
                    </Link>
                    <Link to="/generate" className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/generate" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"}`}>
                        <PlusCircle size={22} /> Generate
                    </Link>
                    <Link to="/history" className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all font-semibold text-xs ${location.pathname === "/history" ? "text-blue-400 bg-blue-900/30" : "text-gray-400 hover:text-white"}`}>
                        <History size={22} /> History
                    </Link>
                </div>
            </nav>
        </>
    );
}
