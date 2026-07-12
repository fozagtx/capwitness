"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("relative overflow-hidden border border-border/80", {
  variants: {
    tone: {
      default: "bg-card text-card-foreground",
      muted: "bg-muted text-foreground",
      accent: "border-primary/20 bg-primary/5 text-foreground",
      danger: "border-destructive/25 bg-destructive/5 text-foreground",
    },
    radius: {
      none: "rounded-none",
      medium: "rounded-2xl",
      large: "rounded-[1.25rem]",
    },
    elevation: {
      flat: "",
      raised: "shadow-sm shadow-primary/5",
    },
  },
  defaultVariants: {
    tone: "default",
    radius: "medium",
    elevation: "flat",
  },
});

export type SurfaceProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceVariants>;

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, tone, radius, elevation, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(surfaceVariants({ tone, radius, elevation }), className)}
      {...props}
    />
  ),
);

Surface.displayName = "Surface";

