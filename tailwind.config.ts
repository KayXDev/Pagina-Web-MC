import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './partner/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        minecraft: {
          grass: '#7BC043',
          dirt: '#8B6F47',
          stone: '#7F7F7F',
          obsidian: '#1A0033',
          diamond: '#47D1E8',
          gold: '#F9E547',
          redstone: '#C62424',
        },
      },
      fontFamily: {
        minecraft: ['Press Start 2P', 'cursive'],
        gaming: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(71, 209, 232, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(71, 209, 232, 0.8)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'minecraft-pattern': "url('/patterns/minecraft-bg.png')",
      },
    },
  },
  plugins: [],
}
export default config
