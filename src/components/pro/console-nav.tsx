"use client";

import React from "react";
import {
  BookOpen,
  ReceiptText,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import { consoleNavigation } from "@/content/proofrun";
import { cn } from "@/lib/utils";

const navigationIcons = {
  overview: SquareTerminal,
  receipt: ReceiptText,
  settings: Settings2,
  docs: BookOpen,
};

type ConsoleNavProps = React.HTMLAttributes<HTMLElement>;

export const ConsoleNav = React.forwardRef<HTMLElement, ConsoleNavProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      aria-label="Console"
      className={cn(
        "flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible",
        className,
      )}
      {...props}
    >
      {consoleNavigation.map((item, index) => {
        const Icon = navigationIcons[item.icon];
        return (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              "group flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              index === 0
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[18px] text-muted-foreground group-hover:text-foreground"
            />
            {item.label}
          </a>
        );
      })}
    </nav>
  ),
);

ConsoleNav.displayName = "ConsoleNav";

