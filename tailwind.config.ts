// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
module.exports = {
  experimental: {
    optimizeUniversalDefaults: true,
  },
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // adjust according to your project structure
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    // tailwind.config.js
    extend: {
      backgroundImage: {
        'kas-fund-split': 'conic-gradient(#3bf5b2 0% 33%, #5fcf8f 33% 66%, #1e3d38 66% 100%)',
        'token-distribution': 'conic-gradient(#3bf5b2 0% 20%, #6ee7b7 20% 84%, #1e3d38 84% 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};