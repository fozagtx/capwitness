import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid size-7 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-4 text-primary" fill="none">
        <path
          d="M6 7.5 12 4l6 3.5v9L12 20l-6-3.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="m8.5 12 2.2 2.2 4.8-5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </span>
  );
}

