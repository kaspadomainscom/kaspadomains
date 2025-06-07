// src/app/loading.tsx
/* eslint-disable @next/next/no-img-element */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <img
        src="/loader.gif"
        alt="Loading..."
        width={96}
        height={96}
        className="mb-4"
      />
      <div className="text-lg font-semibold">Loading...</div>
    </div>
  );
}
