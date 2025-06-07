// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <img
        src="/loader.gif"
        alt="Loading..."
        className="w-24 h-24 mb-4"
      />
      <div className="text-lg font-semibold">Loading...</div>
    </div>
  );
}