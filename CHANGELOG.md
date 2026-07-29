# Changelog

## [Session] — 2026-07-29
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-29T18-26-22-147Z_019faf20-ad01-7d56-b01f-00e3388c0bf4.jsonl -->

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
