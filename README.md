# Pericarp

A distraction-limiting mini browser for self-use. The app is a temporary, sealed browsing session rather than a normal browser. On launch, the user declares a fixed set of allowed entries, presses Start, and the list is locked for the duration of the session. Navigation is restricted to those entries only. When the session ends, everything is wiped.

**Core thesis:** Browsing should require a plan.

## Built with assistance from
- Antigravity IDE (Gemini 3.1 Pro)

## Stack

- Electron desktop app
- Vanilla HTML/CSS/JS (no heavy UI frameworks, no build step)
- Internal `session.fromPartition` for isolated in-memory sessions that wipe cleanly on exit

## Features

- **Stateless by Default:** Every fresh launch is a blank slate.
- **Strict Allowlist:** Enter exact domains or use `*.domain.com` wildcards. 
- **Inert Links:** Any link pointing outside the allowlist is visibly greyed out and unclickable.
- **Session Timers & Stats:** Set an optional session timer. On close, view a breakdown of how many distracting clicks and redirects were successfully blocked.
- **Templates:** Drag and drop `.txt` or `.md` files to instantly load an allowlist.
- **Exportable Logs:** Save detailed Markdown logs of your browsing session history.
- **Split Pane:** Shift-click any sidebar item to cross-reference documentation side-by-side.

## Setup & Run

```bash
npm install
npm start
```

## Shortcuts
- `Cmd/Ctrl + Shift + P`: Global quick-launch hotkey to summon Pericarp.
- `Cmd/Ctrl + Left/Right`: Navigate history.
- `Cmd/Ctrl + R` / `F5`: Reload page.
