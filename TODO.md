<!--
  This file powers a live Kanban board (npx md-kanban).

  STRUCTURE:
    ## To Do
    ## In Progress
    ## Done

  CARD FORMAT:
    - [ ] **Title** — Description with #tags
    - [x] **Title** — Description   (x = done → strikethrough)

  SUB-TASKS (nested checkboxes):
    - [ ] **Parent task** — Description
      - [x] Completed sub-task
      - [ ] Pending sub-task
        - [ ] Third-level sub-task
    Indent with 2 spaces per level. Unlimited nesting depth.
    The board renders up to 4 visual levels with progress badges.

  PRIORITY INDICATORS (render as colored dots, multiple allowed):
    #critical (red)  #important (amber)  #polish (green)

  RULES FOR AI AGENTS:
  • Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line
  • Bold the title with **double asterisks**
  • Use an em dash (—) before description, details, and #tags
  • Only H2 (##) sections become columns — H3+ are ignored
  • Drag cards between columns to change status
  • Indent sub-tasks with 2 spaces and use - [ ] / - [x] syntax
  • This comment block is invisible to the board
-->

# kanban-md — Roadmap

## To Do
- [ ] **Due dates** — Parse due dates from card text (due:YYYY-MM-DD or 📅 YYYY-MM-DD) and show visual indicators. Overdue cards get a red badge. A "Due Soon" filter in the search palette. #critical
- [ ] **Expanded keyboard shortcuts** — Vim-style navigation: j/k navigate cards, Enter opens edit dialog, Space toggles done, d deletes, c creates new card in current column, Cmd+K opens command palette. #important
- [ ] **Search & filter** — Cmd+K command palette that filters cards across all columns by title, description, or tag. Filters: done, not done, critical only, due this week, by assignee. #critical
- [ ] **Markdown rendering in descriptions** — Render inline markdown in card descriptions: [links](url), `code`, *italic*, **bold**. Zero format change — TODO.md is already markdown. #critical
- [ ] **Column reordering via drag** — Cards are draggable but columns are fixed to file order. Let users drag entire column headers to reorder. Needs PUT /api/columns/reorder. #critical
- [ ] **Undo/redo stack** — Ring buffer of ~20 board states. Ctrl+Z / Ctrl+Shift+Z step through history. Protects against accidental drags, edits, and deletes. Extends the existing delete-undo toast. #important
- [ ] **Card labels / tag system beyond priority** — Any #tag in a description renders as a colored badge. User-defined colors via the @priorities block in the preamble. Unlocks #bug, #feature, #docs, #frontend, #backend. #important
- [ ] **Multi-file / project switcher** — Support --file a.md --file b.md or directory mode (--dir .). UI gets sidebar/dropdown to switch between boards. Useful for monorepos. #important
- [ ] **Assignee support** — Parse @username in descriptions and render as name chips. Purely a display convention. @assignees block in preamble maps usernames → display names + colors. #important
- [ ] **Board templates** — kanban-md init --template bug-tracker scaffolds a TODO.md with preset columns + example cards. Ship 3-4 templates: Kanban (default), Bug Tracker, Sprint Planning, Reading List. #polish
- [ ] **Export** — GET /api/board/export?format=json|csv. CSV for spreadsheet users. Optional static HTML export for sharing a snapshot. #polish
- [ ] **Virtual scrolling for large boards** — Wrap card list in a virtualized container for 100+ card boards. Check if Appica UI ships a virtual list component first. #polish
- [ ] **Git integration (opt-in)** — --git flag that auto-commits TODO.md changes with meaningful messages (kanban-md: moved "Fix login" → In Progress). Respects user's git config. Off by default. #polish
- [ ] **Card creation date** — Track when a card was created via HTML comment in rawLine: <!-- created:2026-07-28 -->. Parser ignores HTML comments so they survive round-trips. UI shows "Added 3 days ago" on hover. #polish
- [ ] **Column WIP limits** — Per-column Work-In-Progress limits (e.g. "In Progress" max 5). Column header turns amber when exceeded. Configured via @wip block in preamble. #polish
- [ ] **Server-side TypeScript** — The "vanilla Node.js" rule should be revisited once the codebase stabilizes. JSDoc types are already in use; adopting TS would improve editor support and catch bugs. #polish
- [ ] **E2E tests with Playwright** — Browser-based tests: open board → drag card → verify file on disk → verify WebSocket sync. Current test suite is solid (79 tests) but has no browser automation. #polish
- [ ] **Plugin system for parser extensions** — Allow custom line parsers (e.g. - [!] **Title** as a warning card with special styling). The modular parser architecture already supports this pattern. #polish


## In Progress
- [x] **Dark mode synced to OS preference** — Three-way theme toggle cycles system → light → dark. Appica UI ThemeProvider enableSystem already respects prefers-color-scheme by default. Manual override persists in localStorage; "system" option restores OS sync. #polish
  - [x] **ThemeToggle** — changed from binary light/dark to three-way cycle (system → light → dark) with Monitor icon for system mode
  - [x] **ThemeProvider** — enableSystem already defaults to true; no provider changes needed


## Done
- [x] **Sub-tasks (nested checkboxes)** — Indented - [ ] lines parse as children of parent cards. Render as collapsible list with progress badge (2/5). Unlimited nesting depth in data model; UI renders up to 4 visual levels. #critical
  - [x] **Parser** — indent-level tracking via cardStack, recursive resolveDuplicateIds
  - [x] **Writer** — recursive serializeCard with indentation, cardHasChanged handles indented rawLines
  - [x] **Server** — recursive findCard/findCardInChildren, PUT /api/cards/:id accepts children field
  - [x] **Reducer** — SUBTASK_TOGGLE, SUBTASK_ADD, SUBTASK_DELETE actions with recursive mapCard
  - [x] **UI** — SubTaskSection + SubTaskItem recursive components with depth-based styling and progress badges
  - [x] **Refactor** — split 583-line server.js into server.js (209), lib/routes.js (241), lib/server-utils.js (133)
  - [x] **Tests** — 4 new parser tests, 3 new writer tests, 4 new reducer tests, 2 new parseCardLine tests
