import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CircleCheck,
  CircleX,
  FileClock,
  LogOut,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ConsoleNav } from "@/components/pro/console-nav";
import { MetricCard } from "@/components/pro/metric-card";
import { Surface } from "@/components/pro/surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getReadiness } from "@/lib/proofrun/config";
import { listReceipts } from "@/lib/proofrun/receipt-store";
import { isOperator } from "@/lib/proofrun/server-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Console",
  description: "Check CAPWitness setup and view receipts.",
};

function receiptTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "warning" as const;
}

export default async function ConsolePage() {
  if (!(await isOperator())) redirect("/access");

  const readiness = getReadiness();
  const receiptResult = await listReceipts().then(
    (receipts) => ({ receipts, error: false }),
    () => ({ receipts: [], error: true }),
  );
  const receipts = receiptResult.receipts;
  const receiptError = receiptResult.error;
  const readyCount = readiness.filter((item) => item.ready).length;
  const allReady = readyCount === readiness.length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-h-10 items-center gap-2.5 rounded-full font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
            CAPWitness
          </Link>
          <form action="/api/logout" method="post">
            <Button type="submit" variant="ghost" size="sm" className="rounded-full">
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-border bg-card/50 px-4 py-3 lg:min-h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <ConsoleNav />
          <div className="mt-8 hidden rounded-2xl border border-border bg-muted/70 p-4 shadow-sm lg:block">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Reminder
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Each receipt covers one run. Never a lasting seal of approval.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <section id="overview" aria-labelledby="overview-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">
                  Console
                </p>
                <h1 id="overview-title" className="mt-2 text-3xl font-semibold">
                  Setup status
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Shows whether required settings are present. Not a live
                  connection check.
                </p>
              </div>
              <Badge tone={allReady ? "success" : "warning"}>
                {allReady ? "Configured" : `${readyCount}/${readiness.length} ready`}
              </Badge>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard
                icon="gauge"
                label="Setup"
                value={`${readyCount}/${readiness.length}`}
                detail="required settings present"
                status={{
                  label: allReady ? "Ready" : "Action needed",
                  tone: allReady ? "success" : "warning",
                }}
              />
              <MetricCard
                icon="receipt"
                label="Receipts"
                value={String(receipts.length)}
                detail="saved from real runs"
                status={{ label: "Real runs only", tone: "info" }}
              />
              <MetricCard
                icon="shield"
                label="Scope"
                value="1 run"
                detail="not a lasting guarantee"
                status={{ label: "One call", tone: "neutral" }}
              />
            </div>
          </section>

          <section
            id="receipts"
            aria-labelledby="receipts-title"
            className="mt-12 scroll-mt-20"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="receipts-title" className="text-xl font-semibold">
                  Receipts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Appear only after a real paid check finishes.
                </p>
              </div>
            </div>

            {receiptError ? (
              <Surface className="mt-5 p-5" radius="large" tone="danger">
                <p className="font-medium text-destructive">
                  Receipt storage could not be read.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check the configured directory permissions, then reload.
                </p>
              </Surface>
            ) : receipts.length === 0 ? (
              <Surface
                className="mt-5 grid min-h-60 place-items-center border-dashed p-8 text-center"
                elevation="raised"
                radius="large"
              >
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-lg bg-secondary text-primary">
                    <FileClock aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-4 font-medium">No receipts yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Finish setup, start the worker, then run a real paid check.
                    This list is never filled with sample data.
                  </p>
                  <Button asChild variant="secondary" className="mt-5">
                    <a href="#documentation">How to start</a>
                  </Button>
                </div>
              </Surface>
            ) : (
              <Surface
                className="mt-5"
                elevation="raised"
                radius="large"
              >
                <div className="hidden grid-cols-[1fr_140px_110px_140px] gap-4 border-b border-border bg-muted px-4 py-3 font-mono text-[11px] uppercase text-muted-foreground md:grid">
                  <span>Run</span>
                  <span>Target</span>
                  <span>Status</span>
                  <span>Completed</span>
                </div>
                {receipts.map((receipt) => (
                  <Link
                    key={receipt.runId}
                    href={`/receipts/${receipt.runId}`}
                    className="grid gap-2 border-b border-border px-4 py-4 last:border-b-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[1fr_140px_110px_140px] md:items-center md:gap-4"
                  >
                    <span className="truncate font-mono text-xs">
                      {receipt.runId}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {receipt.targetServiceId}
                    </span>
                    <Badge tone={receiptTone(receipt.status)} className="w-fit">
                      {receipt.status}
                    </Badge>
                    <time
                      dateTime={receipt.timing.completedAt}
                      className="font-mono text-xs text-muted-foreground"
                    >
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(receipt.timing.completedAt))}
                    </time>
                  </Link>
                ))}
              </Surface>
            )}
          </section>

          <section
            id="configuration"
            aria-labelledby="configuration-title"
            className="mt-12 scroll-mt-20"
          >
            <h2 id="configuration-title" className="text-xl font-semibold">
              Setup
            </h2>
            <Surface className="mt-5" elevation="raised" radius="large">
              {readiness.map((item) => (
                <div
                  key={item.key}
                  className="grid gap-2 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex items-start gap-3">
                    {item.ready ? (
                      <CircleCheck
                        aria-hidden="true"
                        className="mt-0.5 size-4 text-success"
                      />
                    ) : (
                      <CircleX
                        aria-hidden="true"
                        className="mt-0.5 size-4 text-warning"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  <Badge tone={item.ready ? "success" : "warning"}>
                    {item.ready ? "Present" : "Missing"}
                  </Badge>
                </div>
              ))}
            </Surface>
          </section>

          <section
            id="documentation"
            aria-labelledby="documentation-title"
            className="mt-12 scroll-mt-20"
          >
            <h2 id="documentation-title" className="text-xl font-semibold">
              Start the worker
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Fill in the settings above, fund the wallet that pays target
              agents, then run these commands.
            </p>
            <div className="mt-5 overflow-x-auto border border-border bg-card p-4">
              <pre className="font-mono text-xs leading-6 text-muted-foreground">
                <code>{`npm run dev\nnpm run dev:worker`}</code>
              </pre>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

