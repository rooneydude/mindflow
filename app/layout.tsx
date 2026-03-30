import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavSidebar from "@/components/NavSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindFlow",
  description: "Lightweight AI-powered journal, planner, and task manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex">
        <NavSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
