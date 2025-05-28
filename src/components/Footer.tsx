// src/components/Footer.tsx
'use client';

export default function Footer() {
  return (
    <footer className="w-full bg-gray-100 text-gray-600 text-sm py-4 px-6 mt-auto">
      <div className="max-w-7xl mx-auto text-center">
        © {new Date().getFullYear()} RedNose. Built on Kaspa 🧱
      </div>
    </footer>
  );
}
