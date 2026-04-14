/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        cyber: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 12px rgba(34, 211, 238, 0.55), 0 0 28px rgba(34, 211, 238, 0.25)',
        'neon-amber': '0 0 12px rgba(251, 191, 36, 0.5), 0 0 24px rgba(251, 146, 60, 0.2)',
      },
      keyframes: {
        'home-intro-in': {
          '0%': { opacity: '0', transform: 'translateY(1.25rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'home-glow-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        'home-intro-in': 'home-intro-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'home-glow-pulse': 'home-glow-pulse 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
