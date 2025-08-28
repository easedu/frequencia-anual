import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServiceWorkerProvider } from "@/components/ServiceWorkerProvider";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestão Escolar",
  description: "Sistema de Gestão Escolar com Suporte Offline",
  manifest: "/manifest.json",
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default'
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col min-h-screen`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <ServiceWorkerProvider>
              <Header />
              <main className="flex-grow container mx-auto px-4 py-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <Footer />
            </ServiceWorkerProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}