"use client";

import React from "react";
import { Gauge, ReceiptText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Surface, type SurfaceProps } from "./surface";

type MetricCardProps = Omit<SurfaceProps, "title"> & {
  label: string;
  value: string;
  detail: string;
  icon: "gauge" | "receipt" | "shield";
  status?: {
    label: string;
    tone: "neutral" | "success" | "warning" | "danger" | "info";
  };
};

const metricIcons = {
  gauge: Gauge,
  receipt: ReceiptText,
  shield: ShieldCheck,
};

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      className,
      label,
      value,
      detail,
      icon,
      status,
      ...props
    },
    ref,
  ) => {
    const Icon = metricIcons[icon];
    return (
      <Surface
      ref={ref}
      className={cn("min-h-36 p-5", className)}
      elevation="raised"
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-9 place-items-center rounded-md bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        {status && <Badge tone={status.tone}>{status.label}</Badge>}
      </div>
      <dl className="mt-7">
        <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </dd>
      </dl>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </Surface>
    );
  },
);

MetricCard.displayName = "MetricCard";

