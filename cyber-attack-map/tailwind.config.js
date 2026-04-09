/** @type {import('tailwindcss').Config} */
export default {
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
    },
  },
  plugins: [],
};
