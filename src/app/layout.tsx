// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { headers } from 'next/headers';
import { NonceProvider } from "@/context/NonceProvider";


export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kaspadomains.com",
  icons: {
    icon: `/favicon.ico`, // 👈 Add this line
  },
  description: "",
  openGraph: {
    title: "Kaspadomains",
    description: "KNS domain marketplace",
    url: "https://kaspadomains.com",
  },
  twitter: {
    card: "summary_large_image", // Optional: Set a summary card type for Twitter
    title: "kaspadomains",
    description: "Fair launched Kaspa meme token with NFTs and zero team allocation",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const headersList = await headers();
  const nonce = headersList.get('x-csp-nonce') ?? '';


  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-kaspaGreenLight text-gray-900`}
      >
        <Header />
        <div className="flex flex-col md:flex-row min-h-screen">
          <Sidebar />

          <main className="flex-1">
            <NonceProvider nonce={nonce}>
              {children}
            </NonceProvider>
          </main>

        </div>
        <Footer />
      </body>
    </html>
  );
}
