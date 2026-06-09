<!-- Managed under atelier. -->

> **Managed under atelier.** Before starting, read
> `C:\Users\kenrin\Project\.atelier\CHARTER.md` (from WSL:
> `/mnt/c/Users/kenrin/Project/.atelier/CHARTER.md`), the current week log in
> `.atelier\logs\`, and this project's brief + log at
> `.atelier\projects\coding\pericarp\`. Clock out per the charter when done.

# Agent Instructions for Pericarp

## Project Context
Pericarp is a distraction-limiting mini browser for self-use. The app is a temporary, sealed browsing session rather than a normal browser. 
**Core thesis:** Browsing should require a plan.

## Technical Stack & Constraints
- **Framework:** Electron desktop app.
- **Frontend:** Vanilla HTML/CSS/JS. No heavy UI frameworks (like React/Vue) or CSS frameworks (like TailwindCSS) unless explicitly introduced later.
- **Architecture:** Keep it lightweight. The backend relies on Electron's `session.fromPartition` for in-memory sessions that are wiped entirely upon exit (`session.clearStorageData`).

## AI Developer Guidelines
1. **Scope Creep is the Enemy:** Do not add typical browser features like address bars, tabs, bookmarks, or unrestricted navigation.
2. **Minimalist Aesthetics:** Ensure all UI matches the dark, premium, and minimalistic aesthetic requested for the app.
3. **Stateless Defaults:** Always assume no data is carried over between sessions unless using the explicit Template system.
