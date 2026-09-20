"use client";

import { useCallback, useState } from "react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  LoaderCircle,
  PencilLine,
  RotateCw,
  Save,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type MemoryState =
  | { status: "idle" | "loading"; markdown: ""; etag: null; error: null }
  | { status: "ready"; markdown: string; etag: string | null; error: null }
  | { status: "error"; markdown: ""; etag: null; error: string };

async function responseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function MemorySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const [memory, setMemory] = useState<MemoryState>({
    status: "idle",
    markdown: "",
    etag: null,
    error: null,
  });

  const loadMemory = useCallback(async () => {
    setMemory({ status: "loading", markdown: "", etag: null, error: null });

    try {
      const response = await fetch("/api/memory", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(
          await responseError(response, "Long-term memory could not be loaded."),
        );
      }

      const markdown = await response.text();
      setDraft(markdown);
      setMemory({
        status: "ready",
        markdown,
        etag: response.headers.get("etag"),
        error: null,
      });
    } catch (error) {
      setMemory({
        status: "error",
        markdown: "",
        etag: null,
        error:
          error instanceof Error
            ? error.message
            : "Long-term memory could not be loaded.",
      });
    }
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);

    // Re-read tool changes on opening; an unsaved editor retains its ETag/draft.
    if (nextOpen && !editing) {
      void loadMemory();
    }
  }

  async function handleSave() {
    if (memory.status !== "ready") return;

    setSaving(true);
    try {
      const response = await fetch("/api/memory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(memory.etag ? { "If-Match": memory.etag } : {}),
        },
        body: JSON.stringify({ content: draft }),
      });

      if (!response.ok) {
        throw new Error(
          await responseError(response, "Long-term memory could not be saved."),
        );
      }

      setMemory({
        status: "ready",
        markdown: draft,
        etag: response.headers.get("etag"),
        error: null,
      });
      setEditing(false);
      toast.success("Memory saved locally");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Long-term memory could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost">
          <BookOpen className="size-4" />
          Memory
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="memory-sheet__title-row">
            <SheetTitle>Long-term memory</SheetTitle>
            {memory.status === "ready" && !editing ? (
              <Button
                className="memory-sheet__edit"
                onClick={() => {
                  setDraft(memory.markdown);
                  setEditing(true);
                }}
                size="sm"
                variant="outline"
              >
                <PencilLine className="size-3.5" />
                Edit Markdown
              </Button>
            ) : null}
          </div>
          <SheetDescription>
            This represents the long-term memory of what the model knows about
            you. This is stored at{" "}
            <code>~/.local/share/sentientos/memory.md</code>
          </SheetDescription>
        </SheetHeader>

        <div className="memory-sheet__body">
          {memory.status === "loading" || memory.status === "idle" ? (
            <div className="memory-loading" role="status">
              <LoaderCircle className="size-5 animate-spin" />
              <span>Reading local memory…</span>
            </div>
          ) : null}

          {memory.status === "error" ? (
            <div className="memory-error" role="alert">
              <p>{memory.error}</p>
              <Button onClick={() => void loadMemory()} size="sm" variant="outline">
                <RotateCw className="size-3.5" />
                Try again
              </Button>
            </div>
          ) : null}

          {memory.status === "ready" && editing ? (
            <div className="memory-editor">
              <label htmlFor="memory-markdown">Markdown</label>
              <textarea
                autoFocus
                id="memory-markdown"
                onChange={(event) => setDraft(event.target.value)}
                spellCheck
                value={draft}
              />
              <div className="memory-editor__actions">
                <Button
                  disabled={saving}
                  onClick={() => {
                    setDraft(memory.markdown);
                    setEditing(false);
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button disabled={saving} onClick={() => void handleSave()}>
                  {saving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save memory
                </Button>
              </div>
            </div>
          ) : null}

          {memory.status === "ready" && !editing && memory.markdown.trim() ? (
            <div className="memory-markdown">
              <ReactMarkdown
                components={{
                  a: ({ children, href }) => (
                    <a href={href} rel="noreferrer" target="_blank">
                      {children}
                      <ExternalLink aria-hidden="true" className="inline size-3" />
                    </a>
                  ),
                }}
                remarkPlugins={[remarkGfm]}
                skipHtml
              >
                {memory.markdown}
              </ReactMarkdown>
            </div>
          ) : null}

          {memory.status === "ready" && !editing && !memory.markdown.trim() ? (
            <div className="memory-empty">
              <FileText className="size-5" />
              <p>No durable memories have been recorded yet.</p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
