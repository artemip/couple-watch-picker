import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header, BottomNav } from "@/components/nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Inter variable font supports weights 100-900 including 450 & 550
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "WatchPicker",
  description: "Choose what to watch tonight",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WatchPicker",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-50">
        <Providers>
          <Header />
          <main className="min-h-screen bg-zinc-950 pb-20 pt-14">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
