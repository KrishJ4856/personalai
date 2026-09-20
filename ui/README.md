# SentientOS UI

The local App Router interface for SentientOS. It reads the existing runtime state from:

- `~/.local/share/sentientos/cards/latest.json`
- `~/.local/share/sentientos/memory.md`

The resolved home-directory path never reaches the browser. Server-only helpers expose narrow cards, memory, and status routes. Card dismissal and memory edits use conflict checks plus atomic replacement writes.

## Run locally

From the repository root:

```bash
npm run ui
```

Or from this directory:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Ask AI

Open the briefing and choose **Ask AI** beside Memory. The sheet uses the existing
`nova/nova-agent.ts` Strands agent, including its memory, card, and Nova Act tools.
Responses and tool activity stream through the local Node server.

Install the repository's dependencies as well as the UI's dependencies. Set
`OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `NOVA_ACT_API_KEY` in the **repository-root**
`.env` (see `.env.example`). Nova now resolves that file independently of the
working directory. `uvx` must be available on the server's PATH for the Nova Act
MCP process. Browser tasks use the existing headed-browser configuration.

`GET /api/chat` returns the current conversation; requesting `text/event-stream`
subscribes to an active turn. `POST /api/chat` accepts a validated message,
conversation ID, and unique request ID. Only one turn can run at a time. Duplicate
request IDs reconnect to the existing work instead of executing it again.

There is one shared, in-memory conversation for this local server. Closing the
sheet or reloading the page does not cancel work; the UI reconnects to the server.
A server restart clears chat history. Conversation history is not written to
disk. Messages and tool results are sent to the configured cloud model; browser
tasks use Nova Act. Only public assistant text and small activity labels are
forwarded to the UI, not reasoning or raw tool payloads.

Agent changes trigger a refresh of the briefing and timestamps. Memory reloads
when reopened; unsaved Markdown edits retain their original ETag and can conflict
with an agent edit rather than silently overwrite it.

The UI scripts bind to `127.0.0.1`. This is a single-user local interface, not an
authenticated hosted service. The chat route rejects cross-origin browser
requests. Do not expose it through a public proxy.

The existing agent tools still use the backend's synchronous file writers. The
chat bridge serializes agent turns, but does not introduce a cross-process lock
between those writers and separately running intelligence cycles.

## Checks

```bash
npm run check
npm run build
```
