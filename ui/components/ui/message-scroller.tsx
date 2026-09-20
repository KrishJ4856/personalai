"use client";

import type { ComponentProps } from "react";
import { MessageScroller as Primitive } from "@shadcn/react/message-scroller";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// shadcn's conversation primitives own anchoring and streamed-message scrolling.
export const MessageScrollerProvider = Primitive.Provider;
export const MessageScrollerItem = Primitive.Item;

export function MessageScroller({
  className,
  ...props
}: ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export function MessageScrollerViewport({
  className,
  ...props
}: ComponentProps<typeof Primitive.Viewport>) {
  return (
    <Primitive.Viewport
      className={cn(
        "size-full min-h-0 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
}

export function MessageScrollerContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Content
      className={cn("flex min-h-full flex-col gap-7", className)}
      {...props}
    />
  );
}

export function MessageScrollerButton() {
  return (
    <Primitive.Button
      className="chat-scroll-button"
      direction="end"
      behavior="instant"
      aria-label="Scroll to latest message"
    >
      <ArrowDown className="size-4" />
    </Primitive.Button>
  );
}
