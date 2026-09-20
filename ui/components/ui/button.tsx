import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ink)] text-[var(--paper)] shadow-[0_10px_30px_rgba(28,27,25,0.16)] hover:bg-[#35332e]",
        outline:
          "border border-[var(--line-strong)] bg-[rgba(255,255,255,0.55)] text-[var(--ink)] hover:border-[var(--ink-muted)] hover:bg-white",
        ghost:
          "text-[var(--ink-muted)] hover:bg-[var(--paper-deep)] hover:text-[var(--ink)]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[0.8125rem]",
        lg: "h-13 px-7 text-[0.9375rem]",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
