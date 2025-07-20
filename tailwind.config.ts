/** @type {import('tailwindcss').Config} */
module.exports = {
  experimental: {
    optimizeUniversalDefaults: true,
  },
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // Adjust paths as per your project structure
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        // Custom conic gradients for your Kaspa domain app
        'kas-fund-split': 'conic-gradient(#3bf5b2 0% 33%, #5fcf8f 33% 66%, #1e3d38 66% 100%)',
        'token-distribution': 'conic-gradient(#3bf5b2 0% 20%, #6ee7b7 20% 84%, #1e3d38 84% 100%)',
      },
      keyframes: {
        // Fade-in and slide up animation
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // Use the fade-in-up keyframes with easing and forwards fill mode
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
      },
    },
  },
  plugins: [],
};
