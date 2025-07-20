// tailwind.config.ts (temporary test)
module.exports = {
  experimental: {
    optimizeUniversalDefaults: true,
  },
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        'kas-fund-split': 'conic-gradient(#3bf5b2 0% 33%, #5fcf8f 33% 66%, #1e3d38 66% 100%)',
        'token-distribution': 'conic-gradient(#3bf5b2 0% 20%, #6ee7b7 20% 84%, #1e3d38 84% 100%)',
      },
      // Remove animations temporarily
      // keyframes: {},
      // animation: {},
    },
  },
  plugins: [],
};
