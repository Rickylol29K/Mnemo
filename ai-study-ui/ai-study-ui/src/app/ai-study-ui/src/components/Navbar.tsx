"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container max-w-6xl mx-auto flex items-center justify-between py-3.5 px-6">
        <Link href="/" className="font-bold text-lg tracking-tight">AI Study</Link>

        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/app" className="nav-link">App</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link className="nav-link text-blue-600" href="/login">Login</Link>
        </nav>

        <button
          className="md:hidden rounded-lg border px-3 py-1.5 text-sm active:scale-[0.98]"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          Menu
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t animate-in">
          <div className="container max-w-6xl mx-auto px-6 py-3 grid gap-2 text-sm">
            <Link href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link href="/app" onClick={() => setOpen(false)}>App</Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
            <Link href="/login" className="text-blue-600" onClick={() => setOpen(false)}>Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}
