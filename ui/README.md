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

## Checks

```bash
npm run check
npm run build
```
