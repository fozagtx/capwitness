"use client";

import React from "react";
import { protocolSteps, receiptSchemaFields } from "@/content/proofrun";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { Surface } from "./surface";

const stepIcons = {
  agent: "solar:user-linear",
  payment: "solar:dollar-minimalistic-linear",
  assertion: "solar:checklist-minimalistic-linear",
  receipt: "solar:document-text-linear",
} as const;

type ProtocolPreviewProps = React.HTMLAttributes<HTMLDivElement>;

export const ProtocolPreview = React.forwardRef<
  HTMLDivElement,
  ProtocolPreviewProps
>(({ className, ...props }, ref) => (
  <Surface
    ref={ref}
    className={cn("mx-auto w-full max-w-5xl overflow-hidden bg-card", className)}
    elevation="raised"
    radius="large"
    {...props}
  >
    <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-sm text-muted-foreground">How a check works</span>
      </div>
    </div>

    <div className="grid min-h-[380px] md:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-border bg-muted/60 p-3 md:block">
        <p className="px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Steps
        </p>
        <nav aria-label="Check steps" className="mt-1 space-y-1">
          {protocolSteps.map((step, index) => (
            <div
              key={step.index}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm",
                index === 0
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              <Icon icon={stepIcons[step.icon]} width={16} aria-hidden />
              {step.title}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 p-5 sm:p-6">
        <h3 className="text-xl font-semibold tracking-tight">
          What’s on the receipt
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Enough to prove the paid call happened. Not enough to pretend the
          agent is forever trustworthy.
        </p>

        <dl className="mt-5">
          {receiptSchemaFields.map((field) => (
            <div
              key={field.label}
              className="grid gap-1 border-b border-border py-3.5 last:border-b-0 sm:grid-cols-[120px_1fr] sm:items-center sm:gap-5"
            >
              <dt className="text-sm text-muted-foreground">{field.label}</dt>
              <dd className="text-sm text-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  </Surface>
));

ProtocolPreview.displayName = "ProtocolPreview";
