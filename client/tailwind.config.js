/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: '#f5f5f7',
          surface: '#ffffff',
          text: '#1d1d1f',
          secondary: '#6e6e73',
          tertiary: '#aeaeb2',
          blue: '#0071e3',
          'blue-dark': '#0077ed',
          green: '#34c759',
          orange: '#ff9500',
          red: '#ff3b30',
          purple: '#af52de',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        apple: '10px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      boxShadow: {
        'apple-sm': '0 1px 4px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        apple: '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)',
        'apple-lg': '0 4px 16px rgba(0,0,0,0.10), 0 16px 48px rgba(0,0,0,0.06)',
        'apple-card': '0 1px 0 rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.06)',
      },
      backdropBlur: {
        apple: '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}
