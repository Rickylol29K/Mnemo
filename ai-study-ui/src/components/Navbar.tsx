"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountButton from "@/components/AccountButton";

// Edit to match your tabs
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/app", label: "Tool" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      {/* 3 columns ensure the brand is perfectly centered */}
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
        {/* LEFT: tabs (never hidden) */}
        <nav className="justify-self-start flex items-center gap-6 shrink-0">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "text-sm transition-colors",
                  active ? "font-medium text-black" : "text-zinc-700 hover:text-black",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* CENTER: brand/title */}
        <div className="justify-self-center">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Mnemo
          </Link>
        </div>

        {/* RIGHT: account menu */}
        <div className="justify-self-end">
          <AccountButton asNavLink={false} className="text-blue-600 hover:text-blue-700" />
        </div>
      </div>
    </header>
  );
}
