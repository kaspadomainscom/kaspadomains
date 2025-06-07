import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-100">
      <div className="max-w-md">
        <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Domain Not Found</h2>
        <p className="text-gray-700 mb-6">
          The domain you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        <Link
          href="/domains"
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Browse Available Domains
        </Link>
        <p className="text-sm text-gray-500 mt-6">
          Still having trouble?{" "}
          <Link
            href="https://t.me/KaspadomainsSupport"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Contact us on Telegram
          </Link>
        </p>
      </div>
    </main>
  );
}
