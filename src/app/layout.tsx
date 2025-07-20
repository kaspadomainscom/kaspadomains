// src/app/layout.tsx

import type { Metadata } from "next";
import './globals.css'; // Tailwind CSS output file

import Header from '@/components/header/Header';
import Footer from '@/components/Footer';
// import Sidebar from '@/components/Sidebar';
import { headers } from 'next/headers';
import { NonceProvider } from "@/context/NonceProvider";
import { QueryProvider } from "./providers/query-provider";
import { WalletProvider } from "@/context/WalletContext";
import { Toaster } from "sonner";


export const dynamic = 'force-dynamic'; // Needed to access request headers per request


export const metadata: Metadata = {
  title: "Kaspadomains – Explore the Kaspa Name System",

  description:
    "Explore and learn about KNS domains on the Kaspa blockchain. Search domain names, check availability, and understand ownership via kaspadomains.com.",

  icons: {
    icon: "/favicon.ico",
  },

  metadataBase: new URL("https://kaspadomains.com"),

  alternates: {
    canonical: "https://kaspadomains.com",
  },

  openGraph: {
    title: "Kaspadomains – Explore the Kaspa Name System",
    description: "Discover available KNS domains and learn how Kaspa Name Service works.",
    url: "https://kaspadomains.com",
    siteName: "Kaspadomains",
    type: "website",
    images: [
      {
        url: "https://kaspadomains.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kaspadomains Open Graph Image",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Kaspadomains",
    description: "Search and explore Kaspa Name Service domains with helpful tools and learning guides.",
    images: ["https://kaspadomains.com/twitter-image.png"],
    creator: "@yourTwitterHandle", // replace if available
  },

  robots: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await the request headers for each request (dynamic)
  const headersList = await headers();

  // Extract CSP nonce from request headers (set in middleware or server)
  const nonce = headersList.get('x-csp-nonce') || "";

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className="antialiased bg-kaspaGreenLight text-gray-900 selection:bg-kaspaMint selection:text-black"
      >
        {/* Provide CSP nonce via React context */}
        <NonceProvider nonce={nonce}>
          <WalletProvider>
            <Toaster richColors position="top-right" />
            {/* Header is outside flex wrapper for consistent layout */}
            <Header />

            <div className="flex flex-col md:flex-row min-h-screen">
              {/* Sidebar for navigation or filters */}
              {/* <Sidebar /> */}

              {/* Main content area with React Query provider */}
              <main className="flex-1 min-w-0">
                  <QueryProvider>{children}</QueryProvider>
              </main>
            </div>

            {/* Footer for site info and links */}
            <Footer />
          </WalletProvider>
        </NonceProvider>
      </body>
    </html>
  );
}
