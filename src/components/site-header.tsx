"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Plane } from "lucide-react";
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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/30 transition-transform group-hover:rotate-6">
            <Plane className="h-4 w-4" />
          </span>
          Aerodesk
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 transition-colors hover:bg-sky-500/10 hover:text-foreground ${
                  active ? "bg-sky-500/15 text-foreground" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out" fallback={<UserButton />}>
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Join</Button>
            </SignUpButton>
          </Show>
        </div>
      </div>
    </header>
  );
}
