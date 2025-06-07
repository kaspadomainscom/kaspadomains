// src/app/layout.tsx

import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { headers } from 'next/headers';
import { NonceProvider } from "@/context/NonceProvider";

export const dynamic = 'force-dynamic'; // Required for access to request headers

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "kaspadomains.com",
  icons: {
    icon: `/favicon.ico`,
  },
  description: "",
  openGraph: {
    title: "Kaspadomains",
    description: "KNS domain marketplace",
    url: "https://kaspadomains.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "kaspadomains",
    description: "Fair launched Kaspa meme token with NFTs and zero team allocation",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Await headers() before accessing
  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce') || "";

  // ⚠️ Dev-only warning if nonce missing
  if (process.env.NODE_ENV !== "production" && !nonce) {
    console.warn("⚠️ Missing CSP nonce in headers. Check middleware or navigation method.");
  } else {
    console.log("✅ CSP nonce in headers:", nonce);}

  return (
    <html lang="en">
      <body
      // ${geistSans.variable} ${geistMono.variable} 
        className={`antialiased bg-kaspaGreenLight text-gray-900`}
      >
        <NonceProvider nonce={nonce}>
          <Header />
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar />
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Footer />
        </NonceProvider>
      </body>
    </html>
  );
}
