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
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8 duration-500 animate-in fade-in slide-in-from-bottom-3">
        {children}
      </main>
    </>
  );
}
