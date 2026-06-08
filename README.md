# Pericarp: Project Plan & Roadmap

## 🎯 Project Purpose

A distraction-limiting mini browser for self-use. The app is a temporary, sealed browsing session rather than a normal browser. On launch, the user declares a fixed set of allowed entries, presses Start, and the list is locked for the duration of the session. Navigation is restricted to those entries only. When the session ends, everything is wiped.

This is a commitment device, not a hard lock. The user can always close and reopen the app. The discipline comes from the act of planning the session upfront — deciding what you need before you start browsing, rather than discovering new distractions mid-session.

**Core thesis:** Browsing should require a plan.

---

## 🧠 Design Principles

1. **Session, not a browser:** It exists to be opened, used, and closed.
2. **Planning is the point:** Discipline comes from declaring needs before starting.
3. **The allowlist is the interface:** If it's not on the list, it doesn't exist.
4. **Statelessness is the default:** Every fresh launch is a blank slate.
5. **Honest commitment:** The app is a commitment device that knows it's a commitment device.
6. **Usability serves philosophy:** Constraints that cause more friction than discipline get cut.
7. **The cap is the cap:** If you need more than 15 entries, run another session.

---

## ⚙️ Core Mechanics

### Startup Screen
- **No browsing before lock:** The setup screen exists only to enter the allowlist. 
- **Dynamic Input:** A dark empty screen with a single entry input bar. Entering a value creates the next empty input bar below it.

### Allowlist Entries
- **15-Entry Limit:** The user can add up to 15 entries (domains like `docs.python.org` or path-prefixed URLs like `docs.python.org/3/library`).
- **Decomposition Prompt:** If the cap is reached, the app suggests: *"15 entries is the limit for one session. If you need more, consider whether this is actually two sessions."*

### Session Seal
- Pressing **Start** seals the allowlist. No entries can be added, removed, or modified afterward.

### Navigation Rules
- **Allowed Scope:** Browse freely within approved scopes.
- **Inert Links:** Links to non-allowed destinations are rendered visibly disabled (greyed, struck-through) with a tooltip. Clicking does nothing and is logged.
- **Redirects:** Mid-navigation off-allowlist redirects get a non-modal notification and are logged. The current page does not change.
- **No Browser Chrome:** No general address bar, tabs, popups, or new windows.

### Subresources vs. Navigation
- Domain filtering applies to **top-level navigation and iframes**, not subresources. Assets (fonts, scripts, images) from allowed frames are permitted. 

### In-Session Layout
- **Sidebar:** Allowed entries are listed in a sidebar for navigation.
- **Statelessness:** Uses an in-memory Electron session. On end, wipes cookies, cache, localStorage, etc., via `session.clearStorageData()`.

---

## 🚫 Design Boundaries

- **Public Browsing Only:** Explicitly for documentation, wikis, and news. Authentication is out of scope. 
- **No In-Session Typo Correction:** Entries cannot be edited once "Start" is pressed.

---

## 🛠️ Implementation Stages (Roadmap)

### Stage 0: Foundation & Scaffolding
- [x] Initialize Electron app with `main.js`, `preload.js`, and `index.html`.
- [x] Configure IPC bridge.
- [x] Set up basic build/run scripts and bypass Node v26 fetch bugs.

### Stage 1: The Pre-Session Startup Screen
- [ ] Build minimal, dark UI (`index.html`/`styles.css`).
- [ ] Implement dynamic input appending in `renderer.js` (up to 15 entries).
- [ ] Add 15-cap enforcement and decomposition warning.
- [ ] Add optional time-boxing duration input field.
- [ ] Connect "Start" button to seal entries and send payload via IPC.

### Stage 2: Core Navigation & Constraints (MVP)
- [ ] Implement in-memory session (`session.fromPartition`) for statelessness.
- [ ] Add allowlist filtering (`webRequest.onBeforeRequest` and `will-navigate`).
- [ ] Block new windows and popups.
- [ ] Render off-allowlist links as inert (greyed out, no-op, tooltip).
- [ ] Add non-modal notification for mid-navigation off-allowlist redirects.
- [ ] Create sidebar layout to switch between allowed entries.
- [ ] Ensure `session.clearStorageData()` runs on window close.

### Stage 3: Session Logs & Export
- [ ] Implement in-memory log tracking (visited URLs, timestamps, inert clicks, duration).
- [ ] Intercept window close event to present forced Yes/No export dialog.
- [ ] Add export functionality to save log as `.md` or `.txt`.

### Stage 4: Templates & State Persistence
- [ ] Create strict template parser for allowlists.
- [ ] Add "Import Template" feature to the startup screen.
- [ ] Add "Save as Template" action.
- [ ] Allow editing of imported entries before sealing the session.
- [ ] Implement per-entry state persistence in sidebar (page and scroll position).

### Stage 5: UX Polish & Advanced Features
- [ ] Add dark theme polish consistent with startup screen.
- [ ] Implement keyboard shortcuts (back, forward, reload).
- [ ] Implement Side-by-side split pane for cross-referencing.

---

## 📝 Architecture & Feasibility
- **Stack:** Vanilla Electron (HTML/CSS/JS). No heavy frameworks.
- **Core APIs:** `session.fromPartition`, `webRequest.onBeforeRequest`, `will-navigate`, `new-window`.

---

## 📌 Resolved Decisions
- **Subdomain discovery:** No automatic subdomain discovery.
- **Session duration tracking:** Yes, exported in logs.
- **In-session layout:** Sidebar listing all allowed entries.
- **Blocked link handling:** Inert links (visibly disabled, no navigation, silently logged).
- **Subresource policy:** Allowlist applies to top-level navigation and iframes only.
- **Logs vs. templates:** Distinct artifacts. Logs are history; templates are reusable plans.

---

## ❓ Open Questions
- **Optional timer surfacing:** Visible by default or hidden behind a toggle?
- **Redirect edge cases:** HTTPS vs HTTP, `www` vs bare domains.
- **Blocked attempt history:** How does back/forward behave across blocked attempts?
- **Architectural choice:** Re-evaluate Electron vs. Extension if compatibility issues compound.
