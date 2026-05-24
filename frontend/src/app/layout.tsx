import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LiquidBackground from "@/components/LiquidBackground";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuraSales | Premium Business Tracker",
  description: "Futuristic Sales & Accounting Dashboard",
};

import { CurrencyProvider } from "@/components/CurrencyContext";
import { UserProvider } from "@/components/UserContext";
import { ThemeProvider } from "@/components/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-cyan-500/30" suppressHydrationWarning>
        <ErrorBoundary>
          <UserProvider>
            <ThemeProvider>
              <CurrencyProvider>
                <LiquidBackground />
                <main className="relative z-10 flex-1">
                  {children}
                </main>
                <Toaster position="top-right" theme="dark" richColors />
              </CurrencyProvider>
            </ThemeProvider>
          </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
