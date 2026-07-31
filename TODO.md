<!--
  This file powers a live Kanban board (npx md-kanban).

  @plugins due-dates, warning-cards, assignees

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

  TAGS (any #tag renders as a colored badge):
    #critical (red)  #important (amber)  #polish (green)
    #bug  #feature  #docs  #frontend  #backend — any tag works

  PLUGINS (add to enable extra features):
    @plugins due-dates, warning-cards
    due-dates: parse due:YYYY-MM-DD in descriptions → colored badge
    warning-cards: - [!] syntax → amber left border

  ASSIGNEES (@username renders as initial chips):
    @alice  @bob — mention people in descriptions

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
- [ ] **Due dates** — Extend the existing due-dates plugin: support 📅 YYYY-MM-DD alt syntax, add "Due Soon" filter to CommandPalette, overdue red badge polish. #critical
  - [x] **📅 emoji syntax** — Extend due-dates plugin parseCard() to also match `📅 YYYY-MM-DD` in descriptions (current: only `due:YYYY-MM-DD`). Regex: `/due:\d{4}-\d{2}-\d{2}|📅\s*\d{4}-\d{2}-\d{2}/i`
  - [x] **"Due Soon" filter in CommandPalette** — Add a filter chip/button in the CommandPalette that narrows results to cards with a due date within the next 7 days. Use existing `flattenBoard` data — just add a `filterDueSoon` toggle.
  - [x] **Overdue badge polish** — Verify overdue cards show red badge in all views (KanbanCard, EditCardDialog, CommandPalette results). Add a subtle pulse animation to overdue badges to draw attention.
  - [x] **Tests** — 4 test cases: parseCard with 📅 syntax, parseCard with mixed formats, CommandPalette filter integration, badge rendering in KanbanCard
  - [x] **HelpDialog** — Update keyboard shortcuts + features table with "Due Soon (Cmd+Shift+D)" entry
- [ ] **Board templates** — kanban-md init --template bug-tracker scaffolds a TODO.md with preset columns + example cards. Ship 3-4 templates: Kanban (default), Bug Tracker, Sprint Planning, Reading List. #polish
  - [ ] **Template format** — Define a JSON template schema: `{ name, description, columns: [{ name, emoji, cards: [{ title, description, tags, children }] }] }`. Templates live in `lib/templates/` as `.json` files.
  - [ ] **Kanban template** — Default 3-column board: "📋 To Do", "🚧 In Progress", "✅ Done" with 2-3 example cards each demonstrating sub-tasks, tags, and due dates.
  - [ ] **Bug Tracker template** — Columns: "🐛 Reported", "🔍 Triaging", "🔧 Fixing", "✅ Resolved". Example cards with #bug tag, reproduction steps in description, severity labels.
  - [ ] **Sprint Planning template** — Columns: "📥 Backlog", "🎯 This Sprint", "🚧 In Progress", "👀 Review", "✅ Done". Cards with story points (SP:3) and @assignee examples.
  - [ ] **Reading List template** — Columns: "📚 Want to Read", "📖 Reading", "✨ Finished". Cards with author names, ratings, notes format.
  - [ ] **CLI integration** — `kanban-md init --template <name>` writes the template to `./TODO.md`. If file exists, prompt to overwrite (or use `--force`). `kanban-md init --list` prints available templates.
  - [ ] **HelpDialog** — Add "Templates" section showing `kanban-md init --template` usage + available template names
  - [ ] **Tests** — 3 cases: init with each template verifies output structure, --list output, overwrite prompt behavior
- [ ] **Column WIP limits** — Per-column Work-In-Progress limits (e.g. "In Progress" max 5). Column header turns amber when exceeded. Configured via @wip block in preamble. #polish
  - [ ] **Preamble parser** — Add `parseWipLimits()` to parser.js: reads `@wip {"in-progress":5,"review":3}` from preamble HTML comment. Stores as `column.wipLimit` on matching columns.
  - [ ] **Column header UI** — When `column.wipLimit` is set and card count exceeds it, header badge turns amber (`bg-warning-subtle text-warning-foreground`) and shows "6/5" instead of just "6". Add a subtle warning icon.
  - [ ] **AddCardForm guard** — When column is at WIP limit, the AddCardForm input shows placeholder "WIP limit reached (5/5)" and is disabled. Shows a tooltip: "Column is at its work-in-progress limit."
  - [ ] **Drag-drop guard** — Dropping a card onto a column at WIP limit shows the drop zone in red with "WIP limit exceeded" text. Card bounces back to source column with a toast "Cannot move: In Progress is at its WIP limit of 5."
  - [ ] **Writer** — serializeBoard appends `@wip {...}` to preamble when columns have wipLimit set
  - [ ] **Tests** — 5 cases: parser extracts @wip JSON, writer round-trips @wip, header badge at/over limit, drag rejection, AddCardForm disabled state
  - [ ] **HelpDialog + design.md** — Document @wip syntax, column header behavior, drag-drop guard
- [ ] **Export** — GET /api/board/export?format=json|csv. CSV for spreadsheet users. Optional static HTML export for sharing a snapshot. #polish
  - [ ] **JSON export** — `GET /api/board/export?format=json` returns the full BoardState with all card fields (id, title, description, done, children, dueDate, assignees, tags, createdAt, pinned, warning). Already close to GET /api/board — just ensure completeness.
  - [ ] **CSV export** — `GET /api/board/export?format=csv` returns `text/csv`. Columns: column, title, description, done, due_date, assignees, tags, created_at. Flatten sub-tasks as separate rows with "parent_title" column. Handle commas and quotes in descriptions.
  - [ ] **Static HTML export** — `GET /api/board/export?format=html` returns a self-contained HTML file. Inline all CSS (Appica tokens as custom properties + minimal layout). Render columns as styled divs, cards as styled blocks with checkbox state. No JavaScript — pure snapshot. Add "Exported at" timestamp in footer.
  - [ ] **Export button in UI** — Add a download button to the header (Download icon) that opens a dropdown: "Export as JSON", "Export as CSV", "Export as HTML". Uses the current board's file param.
  - [ ] **Tests** — 4 cases: JSON matches BoardState shape, CSV has correct headers + escaping, HTML is valid + self-contained, export button triggers correct download
  - [ ] **HelpDialog + README** — Document export formats, API endpoint, UI button
- [ ] **Demo: assignees** — Verify the assignees plugin renders correctly in all views. This card has @alice and @bob assigned. #polish
  - [ ] **KanbanCard** — Colored initial chips Ⓐ Ⓑ appear next to tags. Hover shows "Alice" / "Bob" via Tooltip. Colors match @assignees config or auto-assigned palette.
  - [ ] **EditCardDialog** — Assignee section shows @alice and @bob as toggle chips. Quick-toggle buttons appear for both.
  - [ ] **CommandPalette** — Searching "alice" finds this card. Assignee chips visible in results.
- [ ] **E2E tests with Playwright** — Browser-based tests: open board → drag card → verify file on disk → verify WebSocket sync. Current test suite is solid (92 tests) but has no browser automation. #polish
  - [ ] **Playwright setup** — Add `playwright` devDependency + `client/e2e/` directory. Configure to start server.js before tests, kill after. Use a temp TODO.md fixture for each test.
  - [ ] **Critical path tests** — (1) Board renders with columns + cards from fixture, (2) Checkbox toggle updates card + persists after reload, (3) Drag card between columns → file updated on disk, (4) Add card via inline form → appears in column + file, (5) Delete card via button → removed from board + file, (6) Edit card title/description via dialog → file reflects changes.
  - [ ] **Sync tests** — (1) Edit TODO.md on disk → board updates in browser within 500ms, (2) Delete TODO.md → warning banner appears, (3) Recreate TODO.md → board restores, (4) WebSocket disconnect → toast appears, reconnect → toast dismisses.
  - [ ] **Keyboard tests** — (1) `?` opens help dialog, (2) `Cmd+K` opens command palette, (3) `n` focuses first AddCardForm input, (4) `Ctrl+Z` undoes last action, (5) `Ctrl+Shift+Z` redoes.
  - [ ] **Cross-browser** — Run on Chromium + Firefox + WebKit. One smoke test each (board renders, card drag works).
  - [ ] **CI integration** — Add `npm run test:e2e` script. Document in README.md testing section.
- [!] **Assignee support** — Parse @username mentions in descriptions via `@assignees` preamble config. Render as colored initial chips (Ⓐ Alice) in KanbanCard. Type `@username` in description to assign, quick-toggle in EditCardDialog. @important #important
  - [x] **assignees plugin** — `lib/builtin/assignees.js`: extracts @username → card.assignees[], strips from display description
  - [x] **Preamble config** — parser reads `@assignees` JSON for display names + colors, auto-colors unknown users
  - [x] **KanbanCard** — render assignee initials chips next to tags, hover shows name via Tooltip
  - [x] **EditCardDialog** — assignee section: type `@name` to add, quick-toggle buttons for known users
  - [x] **card-utils** — `extractAssignees()`, `getAssigneeDef()`, `formatInitials()` helpers
  - [x] **Types/docs** — `assignees?: string[]` on Card, HelpDialog/README/FORMAT_GUIDE updated
- [ ] **Git integration (opt-in)** — --git flag that auto-commits TODO.md changes with meaningful messages (kanban-md: moved "Fix login" → In Progress). Respects user's git config. Off by default. #polish
  - [ ] **Git detection** — On server start, check if TODO.md is inside a git repo (`git rev-parse --show-toplevel`). Store `gitRoot` in server state. If not in a repo, --git flag prints warning and proceeds without git.
  - [ ] **Commit message builder** — Map each API action to a human-readable message: CARD_ADD → `added "Task title" to Column Name`, CARD_MOVE → `moved "Task title" → Column Name`, CARD_EDIT → `updated "Task title"`, CARD_DELETE → `removed "Task title"`, CARD_TOGGLE → `marked "Task title" as done/undone`. Truncate titles over 60 chars.
  - [ ] **Debounced commits** — Batch rapid changes (e.g., drag + undo + redo within 2 seconds) into a single commit. Use a 2-second debounce timer after the last mutation. Commit message lists all actions: `kanban-md: moved "X" → Done, added "Y" to To Do`.
  - [ ] **CLI flag** — `--git` enables auto-commit. `--git-message-prefix "custom:"` overrides default "kanban-md:" prefix. Respect `user.name` and `user.email` from git config — never override.
  - [ ] **Error handling** — If git commit fails (merge conflict, detached HEAD, permission), show toast but never block the mutation. The file write still succeeds; only the commit is skipped. Log error to server console.
  - [ ] **Tests** — 4 cases: commit message format for each action type, debounce batches multiple changes, --git in non-repo prints warning, failed commit doesn't block file write
  - [ ] **HelpDialog + README** — Document --git flag, message format, debounce behavior
- [ ] **Expanded keyboard shortcuts** — Vim-style navigation: j/k navigate cards, Enter opens edit dialog, Space toggles done, d deletes, c creates new card in current column, Cmd+K opens command palette. #important
  - [ ] **Focused card concept** — Add a `focusedCardId` state to BoardShell. The focused card gets a ring highlight (`ring-2 ring-primary`). j/k move focus up/down through visible cards in the current column. Wrapping: j at last card moves to first card of next column; k at first card moves to last card of previous column.
  - [ ] **Action shortcuts on focused card** — `Enter` → opens EditCardDialog for the focused card. `Space` → toggles done/undone. `d` → opens delete confirmation dialog (or delete immediately if confirmation is off). `e` → opens EditCardDialog (alias for Enter). `p` → toggles pin/unpin.
  - [ ] **Creation shortcut** — `c` focuses the AddCardForm input of the currently focused card's column. If no card is focused, focuses the first column's AddCardForm. `Escape` blurs the input and clears focus.
  - [ ] **Search shortcut** — `Cmd+K` / `Ctrl+K` already works. Ensure focused card is restored after dismissing CommandPalette.
  - [ ] **Global shortcuts** — `Ctrl+Z` / `Ctrl+Shift+Z` for undo/redo (already done). `n` focuses first column's AddCardForm (already done). `?` opens HelpDialog (already done).
  - [ ] **HelpDialog update** — Add full keyboard shortcut reference table including all new vim-style bindings. Group by: Navigation, Card Actions, Creation, Global.
  - [ ] **Tests** — 5 cases: j/k navigation + wrapping across columns, Space toggle on focused card, d delete with confirmation, c focuses AddCardForm, Enter opens EditCardDialog
- [ ] **Column reordering via drag** — Cards are draggable but columns are fixed to file order. Let users drag entire column headers to reorder. Needs PUT /api/columns/reorder. #critical
  - [ ] **Column header drag handle** — Add a gripper icon (GripVertical) on the left side of each column header, visible on hover. `draggable` on the header div. On dragStart, set dataTransfer with column ID. Column body is NOT draggable — only the header.
  - [ ] **Column drop zone** — During a column drag, show vertical drop indicators (thin primary-colored bars) between columns at the cursor position. Calculate insertion index from cursor X position relative to column centers. The source column gets `opacity-50` during drag.
  - [ ] **PUT /api/columns/reorder** — New route. Body: `{ "columnId": "critical", "index": 2 }`. Server mutates column order in BoardState, rewrites TODO.md (H2 sections in new order), chokidar fires, WebSocket broadcasts. Writer must preserve preamble + H1 title position.
  - [ ] **Optimistic update + reconcile** — Reducer: new `COLUMN_MOVE` action. Moves column in local state, API call follows. Server reconciliation on WebSocket sync.
  - [ ] **Pinned card edge case** — When a column is reordered, pinned cards stay pinned within their column. No special handling needed — pinned ordering is per-column.
  - [ ] **Keyboard reordering** — `Ctrl+Shift+Left` / `Ctrl+Shift+Right` moves the focused column left/right by one position. No mouse required.
  - [ ] **Tests** — 5 cases: PUT /api/columns/reorder updates file + BoardState, writer serializes H2s in new order, preamble + H1 preserved, column drag UI flow (Playwright), keyboard reorder
  - [ ] **HelpDialog update** — Add "Column reorder" to drag-and-drop section, document Ctrl+Shift+Arrow shortcuts


## In Progress


## Done
- [x] **Markdown rendering in descriptions** — Render inline markdown in card descriptions: [links](url), `code`, *italic*, **bold**. Zero format change — TODO.md is already markdown. #critical <!-- pinned -->
  - [x] **renderInline()** — tiny markdown→HTML converter: bold, italic, code, links. Escape-then-render — safe by construction.
  - [x] **KanbanCard** — swap plain text `<p>` for rendered HTML via dangerouslySetInnerHTML
  - [x] **Tests** — 8 test cases: bold, italic, code, links, HTML escaping, mixed, plain, empty
- [x] **Search & filter** — Cmd+K / Ctrl+K command palette that filters all cards (including sub-tasks) by title, description, tag, or column. Results show column badge, priority tags, done status. Arrow keys navigate, Enter selects and scrolls to card with highlight. #critical
  - [x] **CommandPalette** — modal overlay with search input, flattened card list, highlight matching text, keyboard navigation
  - [x] **BoardShell** — Cmd+K listener, onSelect scrolls to card with brief ring highlight
  - [x] **flattenBoard** — recursively flattens all cards and sub-tasks into searchable list
- [x] **Card creation date** — Track when a card was created via HTML comment in rawLine. Parser ignores HTML comments so they survive round-trips. UI shows "Created 3 days ago" on hover. #polish
  - [x] **Parser** — extract createdAt from <!-- created:YYYY-MM-DD --> comment, strip from description
  - [x] **Writer** — append createdAt comment when serializing changed cards
  - [x] **Server** — createCard auto-stamps today's date on new cards
  - [x] **Types** — added createdAt?: string to Card interface
  - [x] **UI** — formatCreatedDate() shows relative dates, native tooltip on hover
  - [x] **Tests** — 3 parser tests (extraction, missing, no desc), 2 writer tests (round-trip, changed)
- [x] **Demo: overdue** — Verify overdue date renders with red badge. This card has due:2025-01-15 (past). #polish
  - [x] **KanbanCard** — Shows red "Overdue" badge (past-date color). Badge uses warning/error styling to stand out.
  - [x] **CommandPalette** — This card appears when filtering by due date. Overdue badge visible in results.
  - [x] **Sort order** — When multiple cards have due dates, overdue cards sort first within their column.
- [x] **Demo: due date** — Verify upcoming due date renders correctly. This card has due:2026-08-15. #polish #critical
  - [x] **KanbanCard** — Shows a blue badge "Due Aug 15" (upcoming color). Badge is visible immediately, not just on hover.
  - [x] **EditCardDialog** — Date picker pre-filled with 2026-08-15. Changing date updates badge color in real-time.
  - [x] **CommandPalette** — "Due Soon" filter includes this card (within 7 days of due date as date approaches).
- [x] **Test due soon** — Test due soon — due:2026-08-01 <!-- created:2026-07-31 -->
- [x] **Sub-tasks (nested checkboxes)** — Indented - [ ] lines parse as children of parent cards. Render as collapsible list with progress badge (2/5). Unlimited nesting depth in data model; UI renders up to 4 visual levels. #critical
  - [x] **Parser** — indent-level tracking via cardStack, recursive resolveDuplicateIds
  - [x] **Writer** — recursive serializeCard with indentation, cardHasChanged handles indented rawLines
  - [x] **Server** — recursive findCard/findCardInChildren, PUT /api/cards/:id accepts children field
  - [x] **Reducer** — SUBTASK_TOGGLE, SUBTASK_ADD, SUBTASK_DELETE actions with recursive mapCard
  - [x] **UI** — SubTaskSection + SubTaskItem recursive components with depth-based styling and progress badges
  - [x] **Refactor** — split 583-line server.js into server.js (209), lib/routes.js (241), lib/server-utils.js (133)
  - [x] **Tests** — 4 new parser tests, 3 new writer tests, 4 new reducer tests, 2 new parseCardLine tests
- [x] **Dark mode synced to OS preference** — Three-way theme toggle cycles system → light → dark. Appica UI ThemeProvider enableSystem already respects prefers-color-scheme by default. Manual override persists in localStorage; choosing "system" restores OS sync. #polish
  - [x] **ThemeToggle** — changed from binary light/dark to three-way cycle (system → light → dark) with DeviceDesktop icon for system mode
  - [x] **ThemeProvider** — enableSystem already defaults to true; no provider changes needed
- [x] **Undo/redo stack** — Ring buffer of 20 board states. Visible undo/redo buttons in header with arrow icons. Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts. History clears on page refresh. #important
  - [x] **useUndoRedo** — ref-based ring buffer, useState flags for reactivity, deep-clones states
  - [x] **useBoard** — userDispatch wraps all user actions with pushState, doUndo/doRedo dispatch BOARD_SYNC
  - [x] **BoardShell** — undo/redo buttons in header, keyboard shortcut listeners
- [x] **Card pinning** — Pin cards to the top of their column. Hover-revealed pin icon. Pinned cards sort above unpinned, most recently pinned first. Unpins on drag below pinned section. `` comment in rawLine. #important
  - [x] **Parser/writer** — recognize `<!-- pinned -->` in rawLine → `card.pinned`, append on serialize
  - [x] **Server** — PUT /api/cards/:id accepts `{ pinned: true/false }`
  - [x] **Reducer** — CARD_TOGGLE_PIN action + Card.pinned type
  - [x] **Column.tsx** — sort pinned cards first, unpin on drop below pinned zone
  - [x] **KanbanCard** — hover-revealed pin icon (Pinned/Pin from Appica), amber when active
  - [x] **CommandPalette** — pin indicator (📌) in search results
  - [x] **useBoard** — togglePin() mutation through API
- [x] **Virtual scrolling for large boards** — Lightweight custom VirtualCardList with ResizeObserver-measured heights. Only activates above 30 cards; below threshold renders normally. #polish
  - [x] **VirtualCardList** — renders only visible cards + 5 overscan, measures actual heights via ResizeObserver
  - [x] **Column.tsx** — replaces flat card map with VirtualCardList, simplified drag-drop to column-level
- [x] **Card labels / tag system beyond priority** — Any #tag in a description renders as a colored badge with text label. Unknown tags auto-assigned from 16-color palette via deterministic hash. Quick-toggle buttons in EditCardDialog show all tags from description + priorities. #important
  - [x] **card-utils.ts** — extractTags() returns all tags with defs, getTagDef() auto-colors unknown tags
  - [x] **KanbanCard** — replaced priority dots with text badges showing label name
  - [x] **EditCardDialog** — simplified: removed 'Add priority' form, toggle buttons show all tags in description
  - [x] **CommandPalette** — tag badges in search results use assigned colors
  - [x] **Format guide** — updated preamble in TODO.md and FORMAT_GUIDE
- [x] **Multi-file / project switcher** — Support --file a.md --file b.md or directory mode (--dir .). Server tracks Map of files, one chokidar per file. Frontend shows file-switcher dropdown in header. All routes accept ?file= param. #important
  - [x] **Server** — multi-file CLI, Map-based board state, per-file chokidar watchers, WebSocket includes file field
  - [x] **Routes** — resolveFile(req) extracts ?file=, GET /api/files endpoint, all routes targetable
  - [x] **Frontend** — useBoard: files list, currentFile, switchFile, apiUrl helper
  - [x] **FileSwitcher** — dropdown in header, hidden when single file
  - [x] **README** — Multi-file section, GET /api/files documented
- [x] **In-app help & onboarding** — Teach users (and AI agents reading the file) how to use the UI without leaving the app. #important
  - [x] **`?` help modal** — keyboard shortcut reference + feature overview (search, undo/redo, tags, sub-tasks, drag, create date). Press `?` to open.
  - [x] **Empty-state tips** — contextual hints when columns are empty or board has no cards ("Add your first task below", "Drag cards here", "Press Cmd+K to search")
  - [x] **First-run overlay** — on first visit (localStorage flag), show a quick guided tour pointing at header buttons, search, undo, theme toggle, etc.
- [x] **Plugin system for parser extensions** — Hook-based middleware at parse/serialize points. Configured via `@plugins` block in preamble. Ships with due-dates and warning-cards plugins. Users can drop `.js` files in `~/kanban-md/plugins/`. #polish
  - [x] **Plugin API** — `lib/plugin-runner.js`: loads named plugins from config, calls `parseCard()` and `serializeCard()` hooks per card
  - [x] **Preamble config** — parser reads `@plugins due-dates, warning-cards` from HTML comment block
  - [x] **due-dates plugin** — extracts `due:YYYY-MM-DD` from descriptions → `card.dueDate`, date picker in EditCardDialog, colored badge in KanbanCard
  - [x] **warning-cards plugin** — recognizes `- [!] **Title**` syntax → `card.warning = true`, amber left border, warning toggle in EditCardDialog
  - [x] **User plugin dir** — autoload `.js` files from `<project>/.kanban/plugins/` or `~/kanban-md/plugins/`
  - [x] **KanbanCard styling** — warning cards get amber left border, overdue cards get red/amber/blue badge
  - [x] **Docs update** — HelpDialog, README, design.md, FORMAT_GUIDE updated with plugin docs and new syntax
- [x] **Demo: warning card** — Verify - [!] syntax renders amber left border. This card uses - [!] syntax. #polish
  - [x] **KanbanCard** — Amber 3px left border via `border-l-[3px] border-l-amber-500` (or Appica warning token). Visible at all times, not just on hover.
  - [x] **EditCardDialog** — Warning toggle switch is ON. Toggling off changes - [!] back to - [ ] in the file.
  - [x] **CommandPalette** — Warning indicator (⚠ or amber dot) visible in search results for this card.
