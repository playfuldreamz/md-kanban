<!--
  FORMAT — This file is a live Kanban board (npx md-kanban) powered by plain Markdown.

  Columns  =  ## Column Name
  Cards    =  - [ ] **Title** — Description
             - [x] **Title** — Description   (x = done)

  RULES FOR AI AGENTS:
  • Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line
  • Bold the title with **double asterisks**
  • Use an em dash (—) before any description or details
  • Only H2 (##) sections become columns — H3+ are ignored
  • HTML comments like this block are invisible to the board
-->

# kanban-md — Roadmap

## To Do
- [ ] **Due dates** — Parse due dates from card text (due:YYYY-MM-DD or 📅 YYYY-MM-DD) and show visual indicators. Overdue cards get a red badge. A "Due Soon" filter in the search palette. #critical
- [ ] **Search & filter** — Cmd+K command palette that filters cards across all columns by title, description, or tag. Filters: done, not done, critical only, due this week, by assignee. #critical
- [ ] **Markdown rendering in descriptions** — Render inline markdown in card descriptions: [links](url), `code`, *italic*, **bold**. Zero format change — TODO.md is already markdown. #critical
- [ ] **Column reordering via drag** — Cards are draggable but columns are fixed to file order. Let users drag entire column headers to reorder. Needs PUT /api/columns/reorder. #critical
- [ ] **Expanded keyboard shortcuts** — Vim-style navigation: j/k navigate cards, Enter opens edit dialog, Space toggles done, d deletes, c creates new card in current column, Cmd+K opens command palette. #important
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
- [ ] **Dark mode synced to OS preference** — Add prefers-color-scheme detection so initial theme matches OS. Manual toggle still overrides. Appica UI ThemeProvider already handles the dark class. #polish
- [ ] **Server-side TypeScript** — The "vanilla Node.js" rule should be revisited once the codebase stabilizes. JSDoc types are already in use; adopting TS would improve editor support and catch bugs. #polish
- [ ] **E2E tests with Playwright** — Browser-based tests: open board → drag card → verify file on disk → verify WebSocket sync. Current test suite is solid (79 tests) but has no browser automation. #polish
- [ ] **Plugin system for parser extensions** — Allow custom line parsers (e.g. - [!] **Title** as a warning card with special styling). The modular parser architecture already supports this pattern. #polish

## In Progress

## Done
- [x] **Sub-tasks (nested checkboxes)** — Indented - [ ] lines parse as children of parent cards. Render as collapsible list with progress badge (2/5). Unlimited nesting depth in data model; UI renders up to 4 visual levels. #critical
  - [x] **Parser** — indent-level tracking via cardStack, recursive resolveDuplicateIds
  - [x] **Writer** — recursive serializeCard with indentation, cardHasChanged handles indented rawLines
  - [x] **Server** — recursive findCard/findCardInChildren, PUT /api/cards/:id accepts children field
  - [x] **Reducer** — SUBTASK_TOGGLE, SUBTASK_ADD, SUBTASK_DELETE actions with recursive mapCard
  - [x] **UI** — SubTaskSection + SubTaskItem recursive components with depth-based styling and progress badges
  - [x] **Refactor** — split 583-line server.js into server.js (209), lib/routes.js (241), lib/server-utils.js (133)
  - [x] **Tests** — 4 new parser tests, 3 new writer tests, 4 new reducer tests, 2 new parseCardLine tests
