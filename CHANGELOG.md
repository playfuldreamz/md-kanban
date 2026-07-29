# Changelog

## [Session] — 2026-07-29
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-29T18-26-22-147Z_019faf20-ad01-7d56-b01f-00e3388c0bf4.jsonl -->
- feat: edit existing sub-tasks (title + description) via pencil icon
  
  SubTaskItem rows now show a hover-revealed pencil icon that opens
  the EditCardDialog pre-filled with the sub-task's title and description.
  Saving updates the child optimistically via the new SUBTASK_EDIT
  reducer action, then syncs through PUT /api/cards/:parentId.
  
  Callbacks threaded through the full component tree:
  BoardShell → ColumnList → Column → KanbanCard → SubTaskSection
  → SubTaskItem → EditCardDialog.
- feat: edit existing sub-tasks via pencil icon + EditCardDialog
  
  SubTaskItem rows now show a hover-revealed pencil icon that opens
  the EditCardDialog pre-filled with the sub-task's title and description.
  Saving dispatches the new SUBTASK_EDIT reducer action and syncs
  through PUT /api/cards/:parentId.
  
  New action: SUBTASK_EDIT(parentId, childId, title, description)
  New callback: onEditSubTask threaded through full component tree
- feat: edit sub-tasks via pencil icon + EditCardDialog
  
  SubTaskItem rows show hover pencil that opens EditCardDialog pre-filled
  with title + description. New SUBTASK_EDIT action + onEditSubTask
  callback threaded through full component tree.
- feat: optional description field when adding sub-tasks
  
  AddSubTaskInline now shows a second input for optional description
  below the title. Enter commits both. The description flows through
  the entire stack:
  
  - Reducer: SUBTASK_ADD now includes description + createdAt stamp
  - useBoard: addSubTask(parentId, title, description?)
  - Server: creates child with description in rawLine via canonical format
  - UI: two-line form (title + optional description) at every nestable level
  
  Also added createdAt auto-stamp to new sub-tasks created from the UI.
- fix: sub-task descriptions now render with markdown, smaller sizing
  
  SubTaskItem now shows child.description (if present) below the title,
  using the same renderInline() markdown converter. Description text is
  text-[10px] (smaller than the card's text-xs description) with
  line-clamp-2 to keep sub-task rows compact.
  
  Title+description are wrapped in a flex-1 min-w-0 container so
  truncation works properly alongside the delete button.
- feat: inline markdown rendering in card descriptions
  
  New lib/markdown.ts: renderInline() converts **bold**, *italic*,
  \`code\`, and [links](url) to safe HTML. Escapes raw HTML first so
  user input is never interpreted as markup.
  
  KanbanCard now renders descriptions via dangerouslySetInnerHTML
  with the sanitized output, with Tailwind styles on the generated
  <code>, <a>, <strong>, and <em> tags.
  
  8 new tests (lib/markdown.test.ts). 28 total tests, all green.
- fix: move completed 'Dark mode' card from In Progress to Done column
  
  A checked card ([x]) in a non-Done column violates the Kanban convention.
  The auto-done-on-move feature only triggers on drag; direct file edits
  still need to place done cards in the correct column.
- feat: full symmetry between check and drag for Done column
  
  Three layers of protection against cards in wrong columns:
  
  1. File validation on startup (server-utils.js): validateBoardColumns()
     auto-corrects any misplacement — [x] in non-Done → Done, [ ] in
     Done → first non-Done column. Rewrites the corrected file to disk.
  
  2. Auto-move on check/uncheck (reducer + server): toggling a top-level
     card's checkbox in a non-Done column auto-moves it to Done. Unchecking
     in Done auto-moves it out. Sub-tasks are exempt — they stay nested.
  
  3. Auto-check/uncheck on drag (existing): dragging to Done checks all,
     dragging out unchecks all. Sub-tasks follow their parent.
  
  The file is always the source of truth — any inconsistency (manual
  file edit, git merge, AI writing) is corrected on the next read.
- feat: auto-complete/reopen when moving cards to/from Done column
  
  Dragging a card (and all its sub-tasks) to the Done column now
  automatically marks everything done. Moving back unchecks everything.
  
  - Reducer: CARD_MOVE detects source/target Done columns and calls
    setDoneRecursive to toggle the entire tree optimistically
  - Server: same logic in lib/routes.js move handler — the file write
    includes the updated done states so the file is the source of truth
  - Both use isDoneColumn() to detect Done by id or name (matches
    'done', 'to-do', 'in-progress' workflow columns)
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
