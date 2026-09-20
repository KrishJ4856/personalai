# SentientOS

> A privacy-first, proactive personal AI assistant for Linux that can **perceive, think and act**.

SentientOS started as a 3-day hackathon experiment: what if a personal AI did not just sit inside a chat box waiting for prompts, but could quietly understand what is happening on your computer, remember useful context, proactively surface things that matter, and then actually act on your behalf?

The current prototype uses WhatsApp as its main perception source, a small local Gemma model as a privacy/compression layer, AWS Strands + Amazon Bedrock for the higher-level intelligence layer, and Amazon Nova Act for browser actions.

---

## What it does

SentientOS currently has three main layers:

### 1. Perceive

- `wacli` syncs WhatsApp messages into a local SQLite database.
- SentientOS reads only new messages from that database.
- Messages are grouped by conversation and processed locally.
- A Gemma model running through Ollama classifies each conversation as:
  - `KEEP`
  - `JUNK`
  - `SENSITIVE`
- Useful conversations are compressed into short summaries.
- Sensitive values such as OTPs, passwords, card numbers, IDs, phone numbers and similar private identifiers are removed before the cloud intelligence layer sees them.

### 2. Think

The sanitized summaries are passed to an AWS Strands agent using Moonshot AI Kimi K2.5 through Amazon Bedrock.

The agent updates two local state surfaces:

- **Long-term memory** — durable information about the user
- **Proactive cards** — useful things the user may need to know or act on

The memory and cards are deliberately simple local files:

```text
~/.local/share/sentientos/
├── state.json
├── memory.md
├── cards/
│   └── latest.json
└── whatsapp/
    └── cycle/
        └── latest.json
```

This makes the assistant's memory inspectable and editable instead of hiding it inside an opaque remote memory service.

### 3. Act

The user-facing Strands agent has tools for:

- reading cards
- adding cards
- removing cards
- reading memory
- modifying memory
- getting the current date/time
- controlling a browser through Amazon Nova Act

That means the user can ask things such as:

```text
"Add a card reminding me to buy groceries at 7 PM."

"Remove the assignment card."

"Remember that this is my GitHub account."

"Open the registration form from that card and fill what you already know about me."

"Open Gmail, find the email containing my blog post, then open Hashnode and paste it into the editor."
```

---

## Architecture

```text
                           ┌──────────────────────────┐
                           │        WhatsApp          │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │          wacli           │
                           │     local SQLite DB      │
                           └────────────┬─────────────┘
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │    Local Gemma / Ollama  │
                           │ privacy + compression    │
                           │ KEEP / JUNK / SENSITIVE  │
                           └────────────┬─────────────┘
                                        │
                             sanitized summaries only
                                        │
                                        ▼
                           ┌──────────────────────────┐
                           │      Strands Agent       │
                           │ Kimi K2.5 via Bedrock    │
                           └──────────┬───────┬───────┘
                                      │       │
                           ┌──────────▼───┐ ┌─▼────────────┐
                           │  memory.md   │ │ cards JSON   │
                           └──────────────┘ └──────┬───────┘
                                                   │
                                                   ▼
                                      ┌──────────────────────┐
                                      │    Next.js UI        │
                                      │ briefing + Ask AI    │
                                      └─────────┬────────────┘
                                                │
                                                ▼
                                      ┌──────────────────────┐
                                      │ User-facing Strands  │
                                      │       agent          │
                                      └─────────┬────────────┘
                                                │ MCP
                                                ▼
                                      ┌──────────────────────┐
                                      │  Amazon Nova Act     │
                                      │ visible browser use  │
                                      └──────────────────────┘
```

---

## Tech stack

- **TypeScript / Node.js**
- **Next.js**
- **AWS Strands Agents SDK**
- **Amazon Bedrock**
- **Moonshot AI Kimi K2.5**
- **Amazon Nova Act**
- **MCP**
- **Ollama**
- **Gemma4 E2B**
- **wacli**
- **SQLite**
- **systemd**
- **shadcn/ui**

---

# Setup

## Important platform note

This prototype is currently **Linux-first** and was developed/tested on **Omarchy (Arch Linux) + Hyprland**.

It assumes:

- a Linux desktop
- a working user-level `systemd`
- local Chrome/Chromium availability
- WhatsApp sync through `wacli`

Other Linux distributions should work with some adjustments, but the automatic Ollama installer in this repo is currently Omarchy-specific.

---

## Prerequisites

Install these before running the project:

### Required

- Node.js 20+ and npm
- Git
- Homebrew for Linux
- `uv` / `uvx`
- Google Chrome or Chromium
- a user-level `systemd` session
- an Amazon Bedrock API key
- an Amazon Nova Act API key

### Local AI

The project uses:

```text
gemma4:e2b
```

through Ollama.

On Omarchy, the code can install Ollama using:

```bash
omarchy pkg add ollama
```

On another Linux distribution, **install Ollama yourself before starting SentientOS**, because the automatic installer currently assumes Omarchy.

You can verify Ollama with:

```bash
ollama --version
```

The app will automatically start Ollama if needed and pull `gemma4:e2b` if the model is missing.

---

## 1. Clone the repository

```bash
git clone https://github.com/KrishJ4856/personalai.git
cd personalai
```

Install root dependencies:

```bash
npm install
```

Install UI dependencies:

```bash
npm --prefix ui install
```

The repository currently does not include `tsx` as a package dependency, so the easiest way to run the TypeScript entrypoint is:

```bash
npx tsx index.ts
```

---

## 2. Install Homebrew

`wacli` is installed through Homebrew.

If `brew` is not already available, install Homebrew from:

https://brew.sh/

Verify:

```bash
brew --version
```

---

## 3. WhatsApp / wacli setup

SentientOS uses `wacli` to sync WhatsApp into a local SQLite database.

The application checks for `wacli` automatically.

If Homebrew exists but `wacli` does not, it runs:

```bash
brew install openclaw/tap/wacli
```

If WhatsApp is not authenticated, it runs:

```bash
wacli auth
```

Follow the QR-code authentication flow.

You can manually verify authentication using:

```bash
wacli auth status --read-only --json
```

After authentication, SentientOS creates a persistent user-level systemd service:

```text
~/.config/systemd/user/wacli-sync.service
```

The service runs:

```bash
wacli sync --follow --max-reconnect 0 --presence-mode quiet
```

Check whether it is running:

```bash
systemctl --user is-active wacli-sync.service
```

Expected output:

```text
active
```

For full logs/status:

```bash
systemctl --user status wacli-sync.service
```

The WhatsApp database is expected at:

```text
~/.local/state/wacli/wacli.db
```

---

## 4. Configure Amazon Bedrock

The intelligence layer currently uses:

```text
moonshotai.kimi-k2.5
```

through the OpenAI-compatible Amazon Bedrock Mantle endpoint.

Create your `.env`:

```bash
cp .env.example .env
```

Current `.env.example`:

```env
AWS_BEARER_TOKEN_BEDROCK=

OPENAI_API_KEY=

OPENAI_BASE_URL="https://bedrock-mantle.eu-north-1.api.aws/v1"

NOVA_ACT_API_KEY=

NOVA_ACT_SKIP_PLAYWRIGHT_INSTALL=1
```

### Environment variable details

| Variable | What to put there |
|---|---|
| `AWS_BEARER_TOKEN_BEDROCK` | Your Amazon Bedrock API key. For the current prototype, this can be the same Bedrock key used for `OPENAI_API_KEY`. |
| `OPENAI_API_KEY` | **Your Amazon Bedrock API key**, not an OpenAI key. The Strands `OpenAIModel` client uses this to call the Bedrock OpenAI-compatible endpoint. |
| `OPENAI_BASE_URL` | Bedrock Mantle endpoint. The repo currently uses `eu-north-1`. Change the region if your Bedrock setup uses another supported region. |
| `NOVA_ACT_API_KEY` | Your Amazon Nova Act API key. Generate one at https://nova.amazon.com/act |
| `NOVA_ACT_SKIP_PLAYWRIGHT_INSTALL` | Keep as `1` on Omarchy/Arch after manually installing the Playwright Chromium binary. |

Do **not** commit `.env`.

The model ID is currently hardcoded as:

```text
moonshotai.kimi-k2.5
```

in both the proactive intelligence agent and the user-facing agent. If you switch models, update those files as well.

---

## 5. Install `uv` / `uvx`

Nova Act MCP is launched using `uvx`.

Install `uv` using the official installer:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Restart your terminal and verify:

```bash
uvx --version
```

---

## 6. Install the Playwright Chromium binary

This step matters especially on Arch/Omarchy.

Do **not** use:

```bash
playwright install --with-deps chromium
```

on Arch, because Playwright's dependency installer falls back to Ubuntu and attempts to use `apt-get`.

Instead run:

```bash
uvx --from playwright playwright install chromium
```

You may see a warning that the OS is not officially supported and that Playwright is downloading an Ubuntu fallback build. That is expected for this setup.

The `.env` contains:

```env
NOVA_ACT_SKIP_PLAYWRIGHT_INSTALL=1
```

so Nova Act does not try to run the broken Ubuntu dependency-install step again.

---

## 7. Nova Act MCP

The project launches the Nova Act MCP server automatically through `uvx`.

The current transport is roughly:

```text
uvx --refresh --with "botocore[crt]" amazon-nova-act-mcp
```

The project also launches Nova's browser with:

```text
--window-size=1600,900 --class=NovaActBrowser
```

The custom class is useful for tiling window managers.

### Linux login limitation

On Linux, the current local headed Nova browser starts with its own fresh browser profile.

Do not expect it to automatically reuse the already signed-in Chrome profile you normally use.

For websites requiring authentication, you may need to log in inside the Nova-controlled browser session.

---

## 8. Hyprland / tiling window manager setup

Nova Act can fail to interact if the browser viewport is made too narrow by a tiling window manager.

This happened during development on Hyprland: the browser was being tiled to roughly 800 px wide, which Nova Act rejected as an unsupported viewport.

The browser already launches with the custom class:

```text
NovaActBrowser
```

If you use Hyprland, add this rule to your Hyprland config:

```ini
windowrulev2 = fullscreen, class:^(NovaActBrowser)$
```

Then reload Hyprland:

```bash
hyprctl reload
```

Now Nova-created Chrome windows should automatically open fullscreen.

If you use another tiling window manager, create an equivalent rule or otherwise ensure that the Nova browser is opened at a sufficiently large viewport.

---

# Important: remove the temporary demo replay override

The current `index.ts` in the repository contains a temporary hackathon demo override that replays WhatsApp messages starting from **5:00 PM of the current day**:

```ts
const demoStart = new Date()
demoStart.setHours(17, 0, 0, 0)

const { cycleUpperBoundRowId, chats } =
    getWhatsappCycle(state.whatsapp, demoStart)
```

For normal incremental operation, replace it with:

```ts
const { cycleUpperBoundRowId, chats } =
    getWhatsappCycle(state.whatsapp)
```

This restores the intended behavior:

- first run: process messages from local midnight
- later runs: process only messages after `lastProcessedRowId`

The checkpoint is stored in:

```text
~/.local/share/sentientos/state.json
```

---

# Running SentientOS

## Full pipeline

From the repo root:

```bash
npx tsx index.ts
```

The application will:

1. check/install/start Ollama
2. ensure `gemma4:e2b` exists
3. check/setup `wacli`
4. ensure the WhatsApp sync systemd service is running
5. read the current WhatsApp cycle
6. locally process conversations with Gemma
7. save the latest processed cycle
8. update the WhatsApp checkpoint
9. run the Strands intelligence cycle
10. update memory/cards
11. start the Next.js UI

The UI runs on the local Next.js development server, normally:

```text
http://127.0.0.1:3000
```

---

## Run only the UI

If you already have cards/memory and only want to start the interface:

```bash
npm run ui
```

---

## Build/check the UI

```bash
npm run ui:check
npm run ui:build
```

---

# Local state

SentientOS intentionally stores its state outside the repository:

```text
~/.local/share/sentientos/
```

Main files:

### `state.json`

Tracks WhatsApp processing progress.

### `memory.md`

Human-readable long-term user memory.

### `cards/latest.json`

Proactive cards shown in the UI.

### `whatsapp/cycle/latest.json`

The latest local WhatsApp processing cycle, including local Gemma decisions/summaries.

---

## Resetting local state

Be careful here.

Deleting:

```text
cards/latest.json
```

only clears cards.

It does **not** reset the WhatsApp processing checkpoint.

The checkpoint lives in:

```text
state.json
```

If you want a completely clean local state during development, back up the folder first:

```bash
cp -r ~/.local/share/sentientos ~/.local/share/sentientos-backup
```

Then remove/reset only the files you intentionally want to reset.

---

# Privacy model

The privacy idea behind the project is:

```text
raw personal data
      ↓
small local model
      ↓
filter + redact + compress
      ↓
only useful sanitized observations
      ↓
cloud reasoning model
```

The stronger cloud model should not need the user's full raw WhatsApp history.

The local Gemma layer is explicitly instructed to remove sensitive private identifiers such as:

- passwords
- OTPs
- PINs
- card numbers
- bank account details
- government IDs
- authentication tokens
- phone numbers where private/sensitive
- similar credentials

This is still an experimental prototype, not a formally verified privacy/security boundary. Review the code and prompts before trusting it with important private data.

---

# Nova Act data/security note

When using the free/API-key Nova Act developer experience, Amazon may collect information from interactions with Nova Act, including browser interaction data.

Avoid exposing credentials or sensitive private information unnecessarily during browser automation.

Use this project as a prototype, not as a production password manager or unattended high-risk automation system.

---

# Known limitations

- Currently only WhatsApp is implemented as a perception source.
- Local Gemma inference can be slow on low-end CPUs.
- The current Ollama auto-installer is Omarchy-specific.
- Linux/Arch setup requires manual Playwright browser installation.
- Nova Act's local browser on Linux does not automatically inherit your normal Chrome login profile.
- Browser automation depends on viewport/window-manager behavior.
- Proactive cards may occasionally duplicate.
- Long-term memory is model-maintained and can still make mistakes.
- This is a hackathon prototype, not production software.

---

# Useful troubleshooting

### `wacli` is not syncing

```bash
systemctl --user status wacli-sync.service
```

Restart it:

```bash
systemctl --user restart wacli-sync.service
```

### Ollama is not responding

```bash
ollama ps
```

If needed:

```bash
ollama serve
```

Check model:

```bash
ollama list | grep gemma4:e2b
```

Pull manually:

```bash
ollama pull gemma4:e2b
```

### Nova says Playwright browser binaries are missing

Run:

```bash
uvx --from playwright playwright install chromium
```

and ensure:

```env
NOVA_ACT_SKIP_PLAYWRIGHT_INSTALL=1
```

is present in `.env`.

### Nova browser opens but actions fail because of viewport size

If you use Hyprland, verify the Nova window class:

```bash
hyprctl clients
```

You should see:

```text
class: NovaActBrowser
initialClass: NovaActBrowser
```

Then make sure your fullscreen rule is loaded:

```ini
windowrulev2 = fullscreen, class:^(NovaActBrowser)$
```

and reload:

```bash
hyprctl reload
```

### AWS/Bedrock requests fail

Verify:

```env
OPENAI_API_KEY=<your Bedrock API key>
OPENAI_BASE_URL=https://bedrock-mantle.eu-north-1.api.aws/v1
```

If you changed AWS regions, update the base URL accordingly and make sure Kimi K2.5 is available in that region.

---

# Project status

This was built as a hackathon prototype around one core idea:

> A useful personal AI should be able to **perceive what is happening, decide what matters, remember the right things, and act when asked** — while keeping as much personal processing local as possible.

There is a lot left to build, but the full loop already works:

```text
PERCEIVE → THINK → ACT
```

---

## Repository

https://github.com/KrishJ4856/personalai
