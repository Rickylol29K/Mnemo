import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Study Assistant",
  description: "Summarize notes into flashcards instantly",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <Navbar />
        <main className="container max-w-6xl mx-auto p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
