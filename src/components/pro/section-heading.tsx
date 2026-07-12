"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = React.HTMLAttributes<HTMLDivElement> & {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export const SectionHeading = React.forwardRef<
  HTMLDivElement,
  SectionHeadingProps
>(
  (
    {
      className,
      eyebrow,
      title,
      description,
      align = "left",
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
      {...props}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {description}
        </p>
      )}
    </div>
  ),
);

SectionHeading.displayName = "SectionHeading";

