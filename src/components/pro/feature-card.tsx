"use client";

import React from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type FeatureCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  icon: string;
  descriptions: readonly string[];
};

export const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ title, icon, descriptions, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border/80 bg-muted/60",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-3 px-5 pb-4 pt-6">
        <span className="grid size-10 place-items-center rounded-xl bg-card text-primary shadow-sm">
          <Icon icon={icon} width={22} aria-hidden />
        </span>
        <p className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pb-5">
        {descriptions.map((description) => (
          <div
            key={description}
            className="flex min-h-[52px] items-center rounded-xl bg-card px-3 py-2.5 text-sm leading-5 text-muted-foreground shadow-sm"
          >
            {description}
          </div>
        ))}
      </div>
    </div>
  ),
);

FeatureCard.displayName = "FeatureCard";
