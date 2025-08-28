import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";
import FetchAuthProvider from "@/components/FetchAuthProvider";

export const metadata: Metadata = {
  title: "AI Study Tool",
  description: "Study faster with AI-generated notes, flashcards, and quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900">
        <FetchAuthProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <Toaster richColors />
        </FetchAuthProvider>
      </body>
    </html>
  );
}
