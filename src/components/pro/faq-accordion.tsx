"use client";

import React from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

type FaqItem = {
  title: string;
  content: string;
};

type FaqAccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  items: readonly FaqItem[];
};

export const FaqAccordion = React.forwardRef<HTMLDivElement, FaqAccordionProps>(
  ({ items, className, ...props }, ref) => (
    <div ref={ref} className={cn("flex w-full flex-col", className)} {...props}>
      {items.map((item) => (
        <details
          key={item.title}
          className="group border-b border-border py-1 first:pt-0 last:border-b-0"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span>{item.title}</span>
            <Icon
              icon="lucide:plus"
              width={22}
              className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
              aria-hidden
            />
          </summary>
          <p className="pb-5 pr-8 text-base leading-7 text-muted-foreground">
            {item.content}
          </p>
        </details>
      ))}
    </div>
  ),
);

FaqAccordion.displayName = "FaqAccordion";
