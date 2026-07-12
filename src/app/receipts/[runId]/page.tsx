import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Check,
  CircleDot,
  Clock3,
  Hash,
  ReceiptText,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getReceipt } from "@/lib/proofrun/receipt-store";
import { isOperator } from "@/lib/proofrun/server-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Receipt",
  description: "CAPWitness receipt for one paid agent check.",
};

function tone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "warning" as const;
}

function DataRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 border-b border-border py-4 last:border-b-0 sm:grid-cols-[170px_1fr] sm:gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-xs">{value || "Not observed"}</dd>
    </div>
  );
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  if (!z.uuid().safeParse(runId).success) notFound();
  const receipt = await getReceipt(runId);
  if (!receipt || (!receipt.public && !(await isOperator()))) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-h-10 items-center gap-2 rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
            CAPWitness
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/console">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Console
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText aria-hidden="true" className="size-4 text-primary" />
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-primary">
                Receipt
              </p>
            </div>
            <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
              One paid check
            </h1>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              {receipt.runId}
            </p>
          </div>
          <Badge tone={tone(receipt.status)}>{receipt.status}</Badge>
        </div>

        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="lifecycle-title">
              <h2 id="lifecycle-title" className="text-lg font-semibold">
                What happened
              </h2>
              <dl className="mt-4 border border-border bg-card px-4 sm:px-5">
                <DataRow
                  label="Your order (negotiation)"
                  value={receipt.outer.negotiationId}
                />
                <DataRow label="Your order" value={receipt.outer.orderId} />
                <DataRow
                  label="Target order (negotiation)"
                  value={receipt.inner.negotiationId}
                />
                <DataRow label="Target order" value={receipt.inner.orderId} />
                <DataRow
                  label="Payment hash"
                  value={receipt.inner.paymentTxHash}
                />
              </dl>
            </section>

            <section aria-labelledby="assertions-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="assertions-title" className="text-lg font-semibold">
                    Checks
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pass / fail rules run on the returned JSON.
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {receipt.assertions.filter((item) => item.passed).length}/
                  {receipt.assertions.length} passed
                </span>
              </div>
              {receipt.assertions.length === 0 ? (
                <div className="mt-4 border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                  No checks were requested for this run.
                </div>
              ) : (
                <div className="mt-4 border border-border bg-card">
                  {receipt.assertions.map((assertion, index) => (
                    <div
                      key={`${assertion.path}-${index}`}
                      className="flex gap-3 border-b border-border p-4 last:border-b-0"
                    >
                      {assertion.passed ? (
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-success"
                        />
                      ) : (
                        <X
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-destructive"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-xs">{assertion.path}</code>
                          <Badge>{assertion.operator}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {assertion.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {receipt.failure && (
              <section
                aria-labelledby="failure-title"
                className="border border-destructive/30 bg-destructive/5 p-5"
              >
                <h2
                  id="failure-title"
                  className="font-medium text-destructive"
                >
                  {receipt.failure.category.replaceAll("_", " ")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {receipt.failure.message}
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Clock3 aria-hidden="true" className="size-4 text-primary" />
                Timing
              </h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Started</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {receipt.timing.startedAt}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Completed</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {receipt.timing.completedAt}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Target latency</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {receipt.timing.observedLatencyMs !== undefined
                      ? `${receipt.timing.observedLatencyMs} ms`
                      : "Not observed"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Hash aria-hidden="true" className="size-4 text-primary" />
                Content hashes
              </h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Input</dt>
                  <dd className="mt-1 break-all font-mono text-[11px] leading-5">
                    {receipt.inputHash}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Answer</dt>
                  <dd className="mt-1 break-all font-mono text-[11px] leading-5">
                    {receipt.deliverableHash ?? "Not observed"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-border bg-muted p-5">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <CircleDot aria-hidden="true" className="size-4 text-primary" />
                Limitations
              </h2>
              <ul className="mt-4 space-y-3 text-xs leading-5 text-muted-foreground">
                {receipt.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

