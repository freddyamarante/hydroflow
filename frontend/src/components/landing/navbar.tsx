"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/">
          <Logo
            className="w-36 md:w-44"
            variant={scrolled ? "dark" : "white"}
          />
        </Link>

        {/* Desktop login */}
        <Link
          href="/login"
          className="hidden md:inline-flex items-center justify-center rounded-md bg-[#080935] text-white font-[family-name:var(--font-barlow)] font-bold text-base px-6 py-1.5 hover:bg-[#0a0b45] transition-colors"
        >
          Login
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className={`w-6 h-6 ${scrolled ? "text-[#080935]" : "text-white"}`} />
          ) : (
            <Menu className={`w-6 h-6 ${scrolled ? "text-[#080935]" : "text-white"}`} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-4">
          <Link
            href="/login"
            className="block w-full text-center rounded-md bg-[#080935] text-white font-[family-name:var(--font-barlow)] font-bold text-base px-6 py-2.5"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}
