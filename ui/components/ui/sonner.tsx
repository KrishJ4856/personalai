"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border-[var(--line)] !bg-[var(--paper-raised)] !text-[var(--ink)] !shadow-[0_18px_60px_rgba(35,32,27,0.14)]",
          description: "!text-[var(--ink-soft)]",
          closeButton: "!border-[var(--line)] !bg-[var(--paper)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
