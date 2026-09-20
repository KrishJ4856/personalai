import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Marker({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="marker"
      className={cn(
        "flex min-w-0 items-center gap-2 text-xs text-[var(--ink-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function MarkerIcon({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn("shrink-0 [&_svg]:size-3.5", className)}
      {...props}
    />
  );
}

export function MarkerContent(props: ComponentProps<"span">) {
  return <span data-slot="marker-content" {...props} />;
}
