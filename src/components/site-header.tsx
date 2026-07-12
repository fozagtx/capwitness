"use client";

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";
import { AGENT_STORE_URL } from "@/content/proofrun";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[60px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-10 items-center gap-2 rounded-full font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
          <span className="text-sm">CAPWitness</span>
        </Link>
        <Button asChild size="sm" className="rounded-full px-4">
          <a href={AGENT_STORE_URL} target="_blank" rel="noreferrer">
            Hire on CROO
          </a>
        </Button>
      </div>
    </header>
  );
}
