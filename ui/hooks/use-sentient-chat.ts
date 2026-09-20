"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatSnapshotSchema, type ChatSnapshot } from "@/lib/chat-types";

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : "Couldn’t connect to Sentient. Please reconnect.";
}

export function useSentientChat(open: boolean, onStateChange: () => void) {
  const [snapshot, setSnapshot] = useState<ChatSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const current = useRef<ChatSnapshot | null>(null);
  const connection = useRef<AbortController | null>(null);
  const posting = useRef(false);
  const stateChange = useRef(onStateChange);

  useEffect(() => {
    stateChange.current = onStateChange;
  }, [onStateChange]);

  const acceptSnapshot = useCallback((input: unknown) => {
    const next = chatSnapshotSchema.parse(input);
    const previous = current.current;
    if (
      previous?.sessionId === next.sessionId &&
      previous.revision > next.revision
    )
      return;
    current.current = next;
    setSnapshot(next);
    setPendingMessage(null);
    if (
      previous &&
      (previous.sessionId !== next.sessionId ||
        previous.stateRevision !== next.stateRevision)
    ) {
      stateChange.current();
    }
  }, []);

  const readStream = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader)
        throw new Error("The agent connection did not return a response.");
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (frame.startsWith("data: "))
              acceptSnapshot(JSON.parse(frame.slice(6)));
          }
        }
      } finally {
        reader.releaseLock();
      }
      if (current.current?.busy)
        throw new Error(
          "The connection was interrupted. Your task may still be running. Reconnect to see its progress.",
        );
    },
    [acceptSnapshot],
  );

  const reconnect = useCallback(async () => {
    if (posting.current || connection.current) return;
    const controller = new AbortController();
    connection.current = controller;
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        cache: "no-store",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(await readError(response));
      setConnecting(false);
      await readStream(response);
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(
          caught instanceof Error
            ? caught.message
            : "Couldn’t connect to Sentient.",
        );
    } finally {
      if (connection.current === controller) connection.current = null;
      setConnecting(false);
    }
  }, [readStream]);

  useEffect(() => {
    if (!open) return;
    const kickoff = window.setTimeout(() => {
      void reconnect();
    }, 0);
    const onFocus = () => {
      void reconnect();
    };
    window.addEventListener("focus", onFocus);
    // Detect work started in another tab without launching or replaying a task.
    const interval = window.setInterval(() => {
      void reconnect();
    }, 5000);
    return () => {
      window.clearTimeout(kickoff);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [open, reconnect]);

  useEffect(
    () => () => {
      connection.current?.abort();
    },
    [],
  );

  const send = useCallback(
    async (message: string) => {
      const previous = current.current;
      if (!previous || previous.busy || posting.current || connection.current)
        return false;
      const controller = new AbortController();
      connection.current = controller;
      posting.current = true;
      setPendingMessage(message);
      setError(null);
      let accepted = false;
      let rejected = false;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: previous.sessionId,
            requestId: crypto.randomUUID(),
            message,
          }),
        });
        if (!response.ok) {
          rejected = true;
          throw new Error(await readError(response));
        }
        accepted = true;
        await readStream(response);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(
            rejected && caught instanceof Error
              ? caught.message
              : "The connection was interrupted. Reconnect to check whether your task completed; it won’t be sent again automatically.",
          );
        }
      } finally {
        setPendingMessage(null);
        posting.current = false;
        if (connection.current === controller) connection.current = null;
      }
      return accepted || !rejected;
    },
    [readStream],
  );

  return { snapshot, error, connecting, pendingMessage, send, reconnect };
}
