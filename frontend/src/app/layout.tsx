import type { Metadata } from "next";
import "./globals.css";
import LiquidBackground from "@/components/LiquidBackground";
import { Toaster } from "sonner";

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
    <html lang="en">
      <body className="antialiased font-sans bg-slate-950 text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200" suppressHydrationWarning>
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
