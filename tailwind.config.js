/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'obsidian': '#0a0a0f',
        'deep-blue': '#1a1a2e',
        'deep-purple': '#16213e',
        'cyberpunk': '#ff006e',
        'electric': '#00f5ff',
        'purple-glow': '#b537f2'
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'breathe': 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: 0.3 },
          '50%': { opacity: 0.6 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        }
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}