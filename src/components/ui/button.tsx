import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-safe:active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-foreground bg-foreground text-background shadow-sm hover:bg-foreground/90",
        secondary:
          "border border-border bg-card text-foreground shadow-sm hover:bg-secondary",
        ghost:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-10 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  asChild,
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
