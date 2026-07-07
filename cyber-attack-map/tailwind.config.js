/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slark: {
          bg: '#FFFFFF',
          card: '#F8FAFC',
          border: '#E2E8F0',
          primary: '#C62828',
          'primary-hover': '#B71C1C',
          dark: '#1F2937',
          text: '#111827',
          muted: '#6B7280',
        },
      },
      fontFamily: {
        cyber: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        slark: '0 4px 14px rgba(198, 40, 40, 0.18)',
        'slark-lg': '0 8px 30px rgba(198, 40, 40, 0.12)',
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
        'landing-cta-glow': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(1.06)' },
        },
      },
      animation: {
        'home-intro-in': 'home-intro-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'home-glow-pulse': 'home-glow-pulse 2.8s ease-in-out infinite',
        'landing-cta-glow': 'landing-cta-glow 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
