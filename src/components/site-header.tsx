"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowUpRight, Plane } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/flights", label: "Search" },
  { href: "/pricing", label: "Membership" },
  { href: "/trips", label: "My trips" },
  { href: "/concierge", label: "Concierge" },
  { href: "/studio", label: "Studio" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071e30]/95 text-white shadow-[0_10px_30px_-25px_#03131f] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-heading text-2xl font-semibold tracking-wide focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200" aria-label="Aerodesk home">
          <span className="glow-accent flex size-9 items-center justify-center rounded-lg border border-cyan-200/30 bg-cyan-200/10 text-cyan-100 transition-transform group-hover:-rotate-12">
            <Plane className="h-4 w-4 -rotate-45" />
          </span>
          AERODESK
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-slate-300 md:flex" aria-label="Primary navigation">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-200 ${
                  active ? "bg-cyan-200/15 text-cyan-100" : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-slate-300 [&_[data-slot=button]:hover]:bg-white/10 [&_[data-slot=button]:hover]:text-white"><ThemeToggle /></span>
          <Show when="signed-out" fallback={<UserButton />}>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="bg-cyan-200 text-[#092436] hover:bg-white">Join <ArrowUpRight className="size-3.5" /></Button>
            </SignUpButton>
          </Show>
        </div>
      </div>
      <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 text-xs text-slate-300 md:hidden" aria-label="Mobile navigation">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`shrink-0 rounded-md px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-cyan-200 ${active ? "bg-cyan-200/15 text-cyan-100" : "hover:bg-white/10 hover:text-white"}`}>{link.label}</Link>;
        })}
      </nav>
    </header>
  );
}
