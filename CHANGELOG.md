# Changelog

## [Session] — 2026-07-29
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-29T18-26-22-147Z_019faf20-ad01-7d56-b01f-00e3388c0bf4.jsonl -->
- feat: three-way theme toggle with OS preference sync
  
  ThemeToggle now cycles system → light → dark instead of binary
  light/dark. Uses Appica UI ThemeProvider's built-in enableSystem
  (default true) which respects prefers-color-scheme on first visit.
  
  - System mode: follows OS, DeviceDesktop icon
  - Light mode: SunHigh icon
  - Dark mode: MoonStars icon
  - Manual override persists in localStorage; choosing 'system'
    restores OS sync
  
  No ThemeProvider changes needed — enableSystem already defaults
  to true.
- docs: add sub-task syntax to TODO.md format guide
  
  FORMAT_GUIDE in lib/server-utils.js and project TODO.md preamble
  now include sub-task nesting rules: 2-space indentation, - [ ] / - [x]
  syntax, unlimited depth, 4 visual levels with progress badges.
- docs: update README and AGENTS.md for sub-tasks + server refactor
  
  README.md:
  - Card interface now includes children?: Card[]
  - What breaks parsing → added Sub-tasks section with nested example
  - PUT /api/cards/:id now documents children field
  - State Management lists all 9 reducer actions (incl. sub-task)
  - Frontend Component Tree includes SubTaskSection/SubTaskItem/AddSubTaskInline
  
  AGENTS.md:
  - Directory roadmap: added lib/routes.js, lib/server-utils.js;
    removed stale types.js; added ConvertDialog, ThemeToggle, ToastNotifications
  - Rule 5: updated from 6 to 9 action types
  - Rule 7: server is now split across 3 files, all under 250 lines
  - Component Patterns: added SubTaskItem (recursive) pattern with explicit parentId callbacks

- fix: suppress EADDRINUSE error on WebSocketServer during port fallback

When the HTTP server's listen fails with EADDRINUSE, the attached
WebSocketServer also emits an error. Without a handler, Node crashes
before the fallback loop can try the next port.

## [Session] — 2026-07-28
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-28T18-38-01-831Z_019faa04-fe67-7683-91b5-4e9cf2d5cfe2.jsonl -->
- Add delete button for custom columns, cards move to To Do on delete
- Fallback: treat bare text lines as cards when no - [ ] items found
- Fix priority persistence, multi-dot indicators, updated format guide, thoroughness rules
- Redesign: workflow columns, Appica icons, convert dialog, custom priorities, fix Windows \\r bug
- Add format guide to existing TODO.md files on first load
- Bump to 0.1.3
- Add format guide preamble — auto-creates TODO.md with rules for humans & AI agents
