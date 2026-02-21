import { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

const SuccessModal = ({ show, onClose, score = 95, title = "Congratulations!", message }) => {
    useEffect(() => {
        if (show) {
            const end = Date.now() + 3000;
            const colors = ['#3b82f6', '#ffffff', '#60a5fa'];

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        }
    }, [show]);

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm glass p-8 text-center overflow-hidden border border-white/20 shadow-2xl"
                    >
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
                            className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 ring-4 ring-yellow-400/20"
                        >
                            <Trophy size={48} className="text-white drop-shadow-md" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 mb-2"
                        >
                            {title}
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {message ? (
                                <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium text-lg leading-relaxed">
                                    {message}
                                </p>
                            ) : (
                                <>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">
                                        You scored above excellence level. <br /> Outstanding performance!
                                    </p>
                                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-blue-400 to-blue-600 mb-8 drop-shadow-sm">
                                        {score}%
                                    </div>
                                </>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                            >
                                Continue
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;
