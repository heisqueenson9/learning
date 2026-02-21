import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
    Heart, ArrowRight, ShieldAlert, Sparkles,
    MessageSquareHeart, Ghost, Flame, Trophy,
    ChevronRight, Loader2
} from "lucide-react";

const QUESTIONS = [
    "Where is somewhere in my house you would like to have sex in apart from the bedroom?",
    "Do you want me to talk dirty?",
    "Show me a porn video you’d want us to act out together",
    "Try not to get turned on while I sit on your lap and kiss your neck for 60 seconds.",
    "Would you rather spank someone or be spanked?",
    "Kiss my nipple for 60 seconds.",
    "What’s your biggest sexual fear?",
    "If you had to fuck one animal, what animal would you pick?",
    "Do you love me? How much?",
    "Would you take a shower with me?",
    "How often do you watch something naughty?",
    "How often do you trim down there?",
    "How many people have seen you naked?",
    "What are you wearing?",
    "What’s something you want me to do to you?",
    "Wide or tight p***y",
    "How many kids would you like to have?",
    "Twerk on my lap with only your underwear",
    "Wanna suck my pussy?",
    "Wanna suck my dick?",
    "Do you prefer rough or slow sex?",
    "If I was tied down to the bed right now, what would you do to me?",
    "Have you ever accidentally grabbed someone's butt?",
    "Name one celebrity you would want to make out with",
    "When was the last time you masturbated?",
    "Do you like to listen to music while having sex?",
    "Kiss me passionately?",
    "Tell me how you would make love to me.",
    "Tell me something to get me aroused.",
    "Does naughty talk get you aroused?",
    "Have you ever witnessed people having sex?",
    "Which do you prefer, fuck through panties? or fuck without panties?",
    "Will you romance me without being asked?",
    "Call me and say “I Love You” along with my name as loud as you can.",
    "Do you prefer texting me or talking to me on the phone?",
    "If I was in the mood for sex, will you give it to me?",
    "What’s one thing you can’t live without?",
    "What’s the last thing you searched on your phone?",
    "Of the people in this room, who do you most want to make out with?",
    "What’s your biggest sexual fear?",
    "If your pussy was the key to my success, will you give it to me?",
    "How do you really feel about sex?",
    "How would you feel if my dick was on your pussy right now?",
    "Do you think my pussy will be sweeter than honey?",
    "Do you think my dick will be sweeter than honey?",
    "How will you feel if my pussy was on your dick right now?",
    "Do you prefer skin to skin or condom?",
    "Do you like being lick on your pussy while sex is going on?",
    "If you were to choose a sex time for both of us, how long will that be?",
    "Do I make you nervous?",
    "What is your position on premarital sex?",
    "Tell me one thing I could do that would make you immediately orgasm.",
    "What is your favorite body part for me to suck on?",
    "Would you prefer to dominate me in bed or do you want me to dominate you in bed?",
    "Which is your favorite kind of sex: soft, slow, and sweet or aggressive, fast, and feisty?",
    "If we could only have sex in one position for a month, what position would you pick: pussy or ass?",
    "Is there something you've seen in a steamy movie that you'd like to try?",
    "What do you think is the sexiest part of your body is?",
    "Would you consider yourself flexible (in bed)?",
    "Why did you break up with your last boyfriend or girlfriend?",
    "What position have you always wanted to try?",
    "What do you wish we did in the bedroom?",
    "Where do you love to have sex?",
    "If you could have sex in any location in the world, where would it be?",
    "Where, and how, can I touch you that will turn you on?",
    "How will you like to be sex on your first sex?",
    "If I was with you, which part of my body would you want to lick first?",
    "If I was with you right now, what would you do with me?",
    "If you were asked to give me a sex position, where will that be - pussy or ass?",
    "Name three things you will like to do during sex.",
    "How many times a week would you want to have sex?",
    "Do you think it’s possible to have a friend with benefits?",
    "If I allowed you to do anything to me what would you do?",
    "How much do you like dirty talk?",
    "How will you take it if I put my hand underneath your shirt right now?",
    "What color of underwear do you think I am wearing right now?",
    "How likely will you allow me to touch you down there?",
    "Have you ever wanted to tear my clothes off?",
    "Which position is your favorite for us?",
    "If you could choose anything on my body to see right now what would it be?",
    "What is the difference to you between sex and making love?",
    "What’s your secret move to turn a guy on?",
    "What should a guy do to make you wet?",
    "Have you ever felt hot in the shower while rubbing your body?",
    "Describe your dream sex scenario with me.",
    "Do you like it rough or gentle?",
    "How long is your ideal foreplay?",
    "Have you ever hooked up with someone you knew for less than 24 hours?",
    "How will you react if I kissed you right now?",
    "Have you ever had a threesome?",
    "What's the craziest sexual fantasy you've ever had?",
    "Have you ever been caught masturbating?",
    "How many sexual partners have you had?",
    "What's the best sexual experience you've ever had?",
    "Have you ever had sex in public?",
    "How do you like to be touched during sex?",
    "Have you ever had a friend with benefits?",
    "What's your favorite type of porn?",
    "Have you ever used sex toys?",
    "Do you like to talk dirty during sex?",
    "Have you ever had a one-night stand?",
    "What's your favorite sexual position?",
    "Have you ever had sex with someone you didn't know their name?",
    "Have you ever had sex in a car?",
    "Have you ever faked an orgasm?",
    "What's your favorite part of your partner's body?",
    "Have you ever had phone sex?",
    "Have you ever had sex on a beach?",
    "What's your biggest turn-on?",
    "Have you ever had sex with someone of the same gender?",
    "What's the longest you've gone without sex?"
];

export default function AdultGames() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [qIndex, setQIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSafeGate, setShowSafeGate] = useState(true);

    const currentQuestion = QUESTIONS[qIndex];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!answer.trim()) return;

        setIsSubmitting(true);
        try {
            await api.post(`/auth/adult-game-log-v2?phone_number=${user.phone}`, {
                game_title: "Naughty Truths",
                question: currentQuestion,
                answer: answer
            });

            // Move to next or finish
            if (qIndex < QUESTIONS.length - 1) {
                setQIndex(qIndex + 1);
                setAnswer("");
            } else {
                alert("You've reached the end! You're a legend.");
                navigate("/");
            }
        } catch (err) {
            console.error("Failed to log game:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSafeGate) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass max-w-lg p-10 text-center space-y-6 border-red-500/20"
                >
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <ShieldAlert size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white">Mature Content (18+)</h2>
                    <p className="text-gray-400 font-medium leading-relaxed">
                        You are about to enter the <span className="text-red-400 font-bold">Adult Games Vault</span>.
                        This contains highly explicit sexual questions.
                        By proceeding, you confirm you are 18+ and wish to continue.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate("/")}
                            className="flex-1 py-4 glass border border-white/10 text-gray-400 font-bold rounded-xl hover:bg-white/5"
                        >
                            Get Me Out
                        </button>
                        <button
                            onClick={() => setShowSafeGate(false)}
                            className="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            I Am 18+, Enter
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 relative">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-2xl space-y-8 relative z-10">
                {/* Progress bar */}
                <div className="flex items-center gap-4">
                    <div className="flex-grow h-2 bg-black/20 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }}
                            className="h-full bg-gradient-to-r from-rose-500 to-orange-500"
                        />
                    </div>
                    <span className="text-xs font-black text-gray-500 tracking-widest uppercase">
                        {qIndex + 1} / {QUESTIONS.length}
                    </span>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={qIndex}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="glass p-10 space-y-8 bg-black/40 border-rose-500/10 shadow-2xl"
                    >
                        <div className="flex items-center gap-3 text-rose-400">
                            <Flame size={20} className="animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Naughty Truth</span>
                        </div>

                        <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">
                            {currentQuestion}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="Type your dirty little secret here..."
                                    className="glass-input w-full min-h-[150px] p-6 text-xl text-white placeholder:text-gray-700 resize-none focus:border-rose-500/50"
                                    required
                                />
                                <div className="absolute bottom-4 right-4 text-gray-600">
                                    <MessageSquareHeart size={24} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !answer.trim()}
                                className="w-full py-5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={24} />
                                        Recording secret...
                                    </>
                                ) : (
                                    <>
                                        Submit Answer & Continue
                                        <ChevronRight size={24} />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </AnimatePresence>

                <p className="text-center text-gray-600 text-xs font-medium uppercase tracking-widest">
                    Your answers are strictly confidential between you and the Admin
                </p>
            </div>
        </div>
    );
}
