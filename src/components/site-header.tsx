"use client";

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";

const AGENT_STORE_URL = "https://agent.croo.network/";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-10 items-center gap-2.5 rounded-full font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
          <span className="text-[15px]">CAPWitness</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/integrate">
              <span className="hidden sm:inline">Request JSON</span>
              <span className="sm:hidden">JSON</span>
            </Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-4">
            <a href={AGENT_STORE_URL} target="_blank" rel="noreferrer">
              Agent Store
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
