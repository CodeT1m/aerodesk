"use client";

import { SiteBackdrop } from "@/components/site-backdrop";
import { SiteHeader } from "@/components/site-header";
import { usePathname } from "next/navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/studio")) {
    return children;
  }

  return (
    <>
      <SiteBackdrop />
      <SiteHeader />
      <main className="site-shell-main relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 duration-500 animate-in fade-in slide-in-from-bottom-3">
        {children}
      </main>
      <footer className="relative border-t border-border/70 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <span className="font-heading text-lg font-semibold tracking-wide text-foreground">AERODESK</span>
          <span>Flight discovery and simulated booking, all in one place.</span>
          <span className="font-mono">DESIGNED FOR THE JOURNEY</span>
        </div>
      </footer>
    </>
  );
}
