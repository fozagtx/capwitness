import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-sm border px-2 font-mono text-[11px] font-medium uppercase tracking-wide",
        tone === "neutral" && "border-border bg-secondary text-muted-foreground",
        tone === "success" &&
          "border-success/30 bg-success/10 text-success-foreground",
        tone === "warning" &&
          "border-warning/30 bg-warning/10 text-warning-foreground",
        tone === "danger" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "info" && "border-primary/30 bg-primary/10 text-primary",
        className,
      )}
      {...props}
    />
  );
}

