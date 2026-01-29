"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass-header">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="font-heading text-2xl text-background transition-transform group-hover:scale-105">
            Juridisk
          </span>
          <span className="bg-background text-primary px-1.5 py-0.5 rounded-md text-xl font-semibold transition-transform group-hover:scale-105">
            AI
          </span>
        </Link>
        <nav className="flex gap-6">
          <Link
            href="/"
            className={`text-background transition-all pb-1 ${
              pathname === "/"
                ? "opacity-100 border-b-2 border-accent-light"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            Søk
          </Link>
          <Link
            href="/upload"
            className={`text-background transition-all pb-1 ${
              pathname === "/upload"
                ? "opacity-100 border-b-2 border-accent-light"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            Last opp
          </Link>
        </nav>
      </div>
    </header>
  );
}
