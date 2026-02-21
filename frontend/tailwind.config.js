/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#2563eb',
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    900: '#1e3a8a',
                    glow: '#60a5fa',
                },
                dark: {
                    bg: '#000000',
                    surface: '#1c1c1e',
                    glass: 'rgba(28, 28, 30, 0.65)',
                    border: 'rgba(255, 255, 255, 0.12)',
                    text: '#f5f5f7',
                    subtext: '#86868b',
                },
                light: {
                    bg: '#fbfbfd',
                    surface: '#ffffff',
                    glass: 'rgba(255, 255, 255, 0.65)',
                    border: 'rgba(0, 0, 0, 0.08)',
                    text: '#1d1d1f',
                    subtext: '#4b5563',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'blob': 'blob 7s infinite',
                'float': 'float 6s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        // Animation delay utilities plugin
        function ({ addUtilities }) {
            addUtilities({
                '.animation-delay-1000': { 'animation-delay': '1s' },
                '.animation-delay-2000': { 'animation-delay': '2s' },
                '.animation-delay-3000': { 'animation-delay': '3s' },
                '.animation-delay-4000': { 'animation-delay': '4s' },
                '.animation-delay-5000': { 'animation-delay': '5s' },
                '.active\\:scale-98:active': { 'transform': 'scale(0.98)' },
            });
        },
    ],
}
