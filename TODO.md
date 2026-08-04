<!--
  This file powers a live Kanban board (npx md-kanban).

  @plugins due-dates, warning-cards, assignees

  ============================================================================
  STRUCTURE
  ============================================================================
    ## To Do
    ## In Progress
    ## Done
  Only H2 (##) sections become columns. Drag cards between them to change status.
  Non-standard columns (e.g. "🔴 Critical") trigger an auto-conversion prompt
  offering to migrate to the standard workflow above.

  ============================================================================
  CARD FORMAT
  ============================================================================
    - [ ] **Title** — Description with #tags
    - [x] **Title** — Description   (x = done → strikethrough)
  Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line.
  Bold the title with **double asterisks**. Use an em dash (—) before the
  description, details, and #tags.

  ============================================================================
  SUB-TASKS (nested checkboxes)
  ============================================================================
    - [ ] **Parent task** — Description
      - [x] Completed sub-task
      - [ ] Pending sub-task
        - [ ] Third-level sub-task
    Indent with 2 spaces per level. Unlimited nesting depth in the data model.
    The board renders up to 4 visual levels with progress badges (e.g. "▸ 2/5").

  ============================================================================
  TAGS
  ============================================================================
  Any #tag in a description renders as a colored badge in the board:
    #critical (red)    #important (amber)    #polish (green)
    #bug  #feature  #docs  #frontend  #backend — any custom tag works
  Unknown tags get auto-assigned colors from a 16-color palette.
  Custom colors via @priorities in the preamble:
    @priorities {"critical":{"label":"Critical","color":"bg-red-500","ring":"ring-red-500/30"}}

  ============================================================================
  PLUGINS
  ============================================================================
  Enable plugins with @plugins in the preamble (comma-separated names):
    @plugins due-dates, warning-cards, assignees

  ── due-dates ──
  Add a due date to any card using either format:
    due:YYYY-MM-DD   (keyword — e.g. due:2026-08-15)
    📅 YYYY-MM-DD     (emoji — e.g. 📅 2026-08-15)
  Renders a colored badge: blue (upcoming), amber (today/soon), red (overdue).
  Overdue badges pulse to draw attention. Press Cmd+K for a "Due Soon" filter.

  ── warning-cards ──
  Prefix a card with - [!] instead of - [ ] to add an amber left border:
    - [!] **Urgent fix** — Needs immediate attention
  Toggle warning on/off in the card's edit dialog.

  ── assignees ──
  Mention @username in descriptions to assign people:
    - [ ] **Fix bug** — @alice @bob review the login flow
  Renders as colored initial chips (Ⓐ Alice, Ⓑ Bob) on the card.
  Configure display names and colors in the preamble:
    @assignees {"alice":{"label":"Alice","color":"bg-pink-500","ring":"ring-pink-500/30"}}

  ============================================================================
  PINNED CARDS
  ============================================================================
  Pin a card to the top of its column by adding <!-- pinned -- > anywhere
  in the card line. Toggle via the hover-revealed pin icon in the board.
    - [ ] **Important reference** — Keep at top <!-- pinned -- >

  ============================================================================
  CREATION DATES
  ============================================================================
  Every new card gets an auto-stamped creation date:
    <!-- created:2026-07-29 -- >
  Visible in the board as "Created 3 days ago" on card hover.
  Handled automatically — no manual editing needed.

  ============================================================================
  AUTO-CORRECT BEHAVIOR
  ============================================================================
  The board automatically keeps your columns organized:
    • Cards marked [x] (done) are moved to the "Done" column.
    • Cards un-marked back to [ ] in Done are moved to the first active column.
    • Cards with - [!] (warning) stay in Done even when undone.
  This only applies to boards using the standard To Do / In Progress / Done
  workflow. Custom columns (🔴 Critical, etc.) are left as-is.

  ============================================================================
  KEYBOARD SHORTCUTS (in the browser)
  ============================================================================
    ?         Open this help reference
    Cmd+K     Search all tasks (Ctrl+K on Windows)
    n         Focus the first "Add task" input
    Ctrl+Z    Undo last action
    Ctrl+Shift+Z  Redo
  Click the Download button in the header to export as JSON, CSV, or HTML.

  ============================================================================
  RULES FOR AI AGENTS
  ============================================================================
  • Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line
  • Bold the title with **double asterisks**
  • Use an em dash (—) before description, details, and #tags
  • Only H2 (##) sections become columns — H3+ are ignored
  • Drag cards between columns to change status
  • Indent sub-tasks with 2 spaces and use - [ ] / - [x] syntax
  • This comment block is invisible to the board
-->

# md-kanban — Roadmap

## To Do
- [ ] **Column WIP limits** — Per-column Work-In-Progress limits (e.g. "In Progress" max 5). Column header turns amber when exceeded. Configured via @wip block in preamble. #polish
  - [ ] **Preamble parser** — Add `parseWipLimits()` to parser.js: reads `@wip {"in-progress":5,"review":3}` from preamble HTML comment. Stores as `column.wipLimit` on matching columns.
  - [ ] **Column header UI** — When `column.wipLimit` is set and card count exceeds it, header badge turns amber (`bg-warning-subtle text-warning-foreground`) and shows "6/5" instead of just "6". Add a subtle warning icon.
  - [ ] **AddCardForm guard** — When column is at WIP limit, the AddCardForm input shows placeholder "WIP limit reached (5/5)" and is disabled. Shows a tooltip: "Column is at its work-in-progress limit."
  - [ ] **Drag-drop guard** — Dropping a card onto a column at WIP limit shows the drop zone in red with "WIP limit exceeded" text. Card bounces back to source column with a toast "Cannot move: In Progress is at its WIP limit of 5."
  - [ ] **Writer** — serializeBoard appends `@wip {...}` to preamble when columns have wipLimit set
  - [ ] **Tests** — 5 cases: parser extracts @wip JSON, writer round-trips @wip, header badge at/over limit, drag rejection, AddCardForm disabled state
  - [ ] **HelpDialog + design.md** — Document @wip syntax, column header behavior, drag-drop guard
- [ ] **Column reordering via drag** — Cards are draggable but columns are fixed to file order. Let users drag entire column headers to reorder. Needs PUT /api/columns/reorder. #critical
  - [ ] **Column header drag handle** — Add a gripper icon (GripVertical) on the left side of each column header, visible on hover. `draggable` on the header div. On dragStart, set dataTransfer with column ID. Column body is NOT draggable — only the header.
  - [ ] **Column drop zone** — During a column drag, show vertical drop indicators (thin primary-colored bars) between columns at the cursor position. Calculate insertion index from cursor X position relative to column centers. The source column gets `opacity-50` during drag.
  - [ ] **PUT /api/columns/reorder** — New route. Body: `{ "columnId": "critical", "index": 2 }`. Server mutates column order in BoardState, rewrites TODO.md (H2 sections in new order), chokidar fires, WebSocket broadcasts. Writer must preserve preamble + H1 title position.
  - [ ] **Optimistic update + reconcile** — Reducer: new `COLUMN_MOVE` action. Moves column in local state, API call follows. Server reconciliation on WebSocket sync.
  - [ ] **Pinned card edge case** — When a column is reordered, pinned cards stay pinned within their column. No special handling needed — pinned ordering is per-column.
  - [ ] **Keyboard reordering** — `Ctrl+Shift+Left` / `Ctrl+Shift+Right` moves the focused column left/right by one position. No mouse required.
  - [ ] **Tests** — 5 cases: PUT /api/columns/reorder updates file + BoardState, writer serializes H2s in new order, preamble + H1 preserved, column drag UI flow (Playwright), keyboard reorder
  - [x] **HelpDialog update** — Add "Column reorder" to drag-and-drop section, document Ctrl+Shift+Arrow shortcuts
- [ ] **E2E tests with Playwright** — Browser-based tests: open board → drag card → verify file on disk → verify WebSocket sync. Current test suite is solid (92 tests) but has no browser automation. #polish
  - [ ] **Playwright setup** — Add `playwright` devDependency + `client/e2e/` directory. Configure to start server.js before tests, kill after. Use a temp TODO.md fixture for each test.
  - [ ] **Critical path tests** — (1) Board renders with columns + cards from fixture, (2) Checkbox toggle updates card + persists after reload, (3) Drag card between columns → file updated on disk, (4) Add card via inline form → appears in column + file, (5) Delete card via button → removed from board + file, (6) Edit card title/description via dialog → file reflects changes.
  - [ ] **Sync tests** — (1) Edit TODO.md on disk → board updates in browser within 500ms, (2) Delete TODO.md → warning banner appears, (3) Recreate TODO.md → board restores, (4) WebSocket disconnect → toast appears, reconnect → toast dismisses.
  - [ ] **Keyboard tests** — (1) `?` opens help dialog, (2) `Cmd+K` opens command palette, (3) `n` focuses first AddCardForm input, (4) `Ctrl+Z` undoes last action, (5) `Ctrl+Shift+Z` redoes.
  - [ ] **Cross-browser** — Run on Chromium + Firefox + WebKit. One smoke test each (board renders, card drag works).
  - [ ] **CI integration** — Add `npm run test:e2e` script. Document in README.md testing section.


- [ ] **Filter bar** — Persistent filter chips above columns: click `#bug` or `@alice` or `due:this-week` to show only matching cards. Multiple chips combine with AND logic. Chips persist via localStorage. Complements transient Cmd+K search with a session-long view filter. #important
  - [ ] **FilterChips component** — Horizontally scrollable row of pill-shaped chips between header and ColumnList. Each chip has label + × dismiss. Click a tag/assignee/due badge on any card to add that filter. "Clear all" link at the end.
  - [ ] **Filter logic in reducer** — New action `SET_FILTERS`. Filter state: `{ tags, assignees, dueSoon, done: hide|show|only }`. Card visibility via `applyFilters(cards, filters)` in `Column.tsx`. AND within category, AND across categories.
  - [ ] **Card badge clicks** — Clicking a tag badge on KanbanCard adds that tag to filters. Clicking an assignee chip adds that assignee. Clicking a due-date badge sets `dueSoon: true`. If filter already active, clicking again removes it (toggle behavior).
  - [ ] **FilterButton in header** — A filter icon (Filter) next to the search button. Shows active filter count as a small badge. Clicking opens a dropdown with quick presets: "My tasks" (if assignees enabled), "Due this week", "#critical only", "Hide done", "Stale" (requires Card Staleness feature).
  - [ ] **URL persistence** — Filter state serialized to URL query params (`?tags=bug,critical&assignees=alice`). Restores on page load. Enables shareable filtered views.
  - [ ] **Tests** — 5 cases: applyFilters AND logic, chip add/remove toggles, localStorage round-trip, URL serialization, badge click dispatches filter action
  - [ ] **HelpDialog + design.md** — Document filter bar, badge-click behavior, URL sharing
- [ ] **Column collapse/expand** — Click column header to collapse it to just the icon + name + count badge (hides card list). Click again to expand. Collapsed state persists in localStorage per column ID. Saves horizontal space on wide sprint boards. #polish
  - [ ] **Column.tsx** — Add `collapsed` state (from localStorage, per column ID). Header becomes clickable with a chevron icon (ChevronRight collapsed, ChevronDown expanded) on the left. When collapsed, cards area + AddCardForm are hidden, column width shrinks to `w-16` showing only icon + count badge in a vertical stack.
  - [ ] **Auto-expand on card creation** — When user types `c` to add a card to a collapsed column, the column auto-expands so they can see the input. Prevents "where did my card go" confusion.
  - [ ] **Drag-drop on collapsed columns** — Collapsed columns still accept drops (show the card count badge flashing on dragover). Dropped card appears when column is expanded. This prevents data loss.
  - [ ] **Keyboard shortcut** — `Shift+C` collapses/expands the column containing the focused card. If no card focused, collapses/expands the first column.
  - [ ] **Tests** — 4 cases: toggle collapse, localStorage round-trip, drag-drop onto collapsed column, keyboard shortcut
  - [ ] **design.md** — Update Column spec with collapsed variant
- [ ] **Card dependencies** — `blocked-by: <hex-hash>` syntax (the 8-char DJB2 hash, not title). Resolves dependencies by stable ID so renaming the blocker doesn't break the link. Multiple blockers supported. Blocked cards show a chain-link icon. If blocker is done, dependency auto-resolves. #important
  - [ ] **Parser** — `parseCardLine()` extracts `blocked-by: a1b2c3d4, f9e8d7c6` from the raw line (after description). Stores as `card.blockedBy: string[]` (hash array). The dependency annotation survives round-trips via rawLine.
  - [ ] **resolveDependencies()** — New function in `parser.js`: after parsing all cards, map each hash to actual card + column. Store `card.blockedByCards: {id, title, column}[]`. Silently drops hashes that don't resolve (card was deleted). **Circular detection**: if A blocks B and B blocks A, detect the cycle, console-warn, and show a special "circular dependency" icon instead of the chain link. Neither blocks the other from being done — circular = broken, skip the guard.
  - [ ] **KanbanCard** — If `card.blockedByCards` has unresolved blockers, render a chain-link icon (Link) with amber color next to the checkbox. Tooltip: "Blocked by: [Title] in [Column]". If all resolved or none, no icon. Circular dependency shows a different icon (AlertTriangle) with "Circular dependency" tooltip.
  - [ ] **EditCardDialog** — "Blocked by" field: type-ahead search that queries card titles across the board. Users see titles; the file stores hashes. Selecting a card inserts its hash. Clear button removes the dependency. Multiple blockers shown as removable chips.
  - [ ] **Soft Done guard** — If a card has unresolved blockers, toggling it done shows a toast "Cannot complete: blocked by 'X'". The toggle is reverted. (Soft guard — warns but the user can remove the dependency and try again.)
  - [ ] **Cross-feature: deep-copy exclusion** — When a recurring card is copied (feature #9), the new copy's `blockedBy` is cleared. Dependencies don't carry forward to the recurrence.
  - [ ] **Cross-feature: archive guard** — When archiving done cards (feature #7), skip any card that is blocking active (non-done) cards. Log: "Skipped 'X' — blocking active cards."
  - [ ] **Tests** — 6 cases: parse multiple hashes, resolve hash to card, rename doesn't break dependency, circular detection warns, blockedBy clears on recur copy, archive skips blockers
  - [ ] **HelpDialog + README** — Document `blocked-by:` syntax, auto-resolve behavior, circular dependency handling
- [ ] **Keyboard move cards** — `Shift+J`/`Shift+K` moves the focused card down/up within its column. `Shift+H`/`Shift+L` moves to previous/next column. Enables full keyboard-driven board reorganization without touching the mouse. #polish
  - [ ] **BoardShell keydown handler** — Extend existing keyboard handler: `Shift+J` → find focused card index, swap with card below (index+1), dispatch `CARD_MOVE` with new index. `Shift+K` → swap with card above. `Shift+H` → move to previous column at bottom. `Shift+L` → move to next column at top. All go through the same `moveCard()` API path as drag-and-drop.
  - [ ] **Focused card tracking** — After move, refocus the moved card (update `focusedCardId` to the same card ID in its new position). This allows chaining: hold Shift, tap J 3 times to move a card 3 spots down.
  - [ ] **Undo integration** — Keyboard moves push to the undo stack like any other mutation. `Ctrl+Z` reverses a Shift+J move.
  - [ ] **Tests** — 4 cases: Shift+J swaps positions, Shift+L changes column, chaining multiple moves, undo reverses keyboard move
  - [ ] **HelpDialog** — Add Shift+J/K/H/L to shortcuts table under "Card Actions"
- [ ] **Markdown preview in EditCardDialog** — Show rendered markdown alongside the raw textarea so users see formatting as they type. Prevents broken links and malformed bold/italic. #polish
  - [ ] **EditCardDialog layout** — Split into side-by-side panels: "Edit" (textarea for title + description) and "Preview" (rendered output). On narrow screens (<640px), stack vertically with a toggle button.
  - [ ] **Preview renderer** — Reuse `renderInline()` from `KanbanCard` for inline markdown (bold, italic, code, links). Render the title as `<h3>` and description as `<div>` with rendered HTML. Show tags as rendered badges, assignees as initial chips, due date as colored badge — exactly how they will appear on the card.
  - [ ] **Live preview** — Preview updates on every keystroke (debounced 300ms). No need to switch tabs — side-by-side is always visible.
  - [ ] **Tests** — 3 cases: preview renders bold/italic/links correctly, preview updates on keystroke, mobile toggle switches between edit and preview
- [ ] **Card staleness (by creation date)** — Cards in non-Done columns created 14+ days ago get an amber dot, 30+ days get a red dot. Based strictly on the existing `createdAt` date stamp — NOT a "last modified" heuristic. Tooltips say "Created 23 days ago", never claim the card was "untouched." Done column cards are excluded regardless of age. Zero new syntax. #polish
  - [ ] **ageInDays()** — Utility in `card-utils.ts`: compare `card.createdAt` to today. Returns days since creation. If no createdAt (legacy cards), returns null (no indicator).
  - [ ] **KanbanCard indicator** — Cards aged 14-29 days show a small amber dot (6px circle, `bg-amber-500`) after the title. Cards aged 30+ days show a red dot (`bg-red-500`). Tooltip on hover: "Created 23 days ago — consider prioritizing or removing." Done column cards never show aging indicators.
  - [ ] **Filter integration** — The filter bar "Stale" preset (via FilterButton dropdown, feature #1) shows only cards aged 14+ days. Useful for backlog grooming sessions. Requires this feature built first.
  - [ ] **Tests** — 4 cases: ageInDays computes correctly, amber dot at 14 days, red dot at 30 days, done cards excluded, missing createdAt returns null
  - [ ] **design.md** — Document aging indicator colors and thresholds
- [ ] **Archive workflow** — Auto-archive done cards to keep TODO.md lean. `md-kanban archive` command moves cards in "Done" older than N days to `ARCHIVE.md`. Configurable via `@archive after: 30` in preamble. Manual trigger via button in header. #polish
  - [ ] **Archive logic** — `lib/archive.js`: scans board for done cards whose `createdAt` is older than the threshold (default 90 days if `@archive` not configured). Writes them as a dated section (`## Archived 2026-08-02`) to `ARCHIVE.md` in the same directory. Removes them from the board. Runs on `md-kanban archive` CLI command or from UI button.
  - [ ] **Preamble config** — Parser reads `@archive after: 30` from preamble. Default 90 days if not configured. `@archive after: 0` disables the archive suggestion and hides the header button.
  - [ ] **Header button** — An "Archive done" button (Archive icon) in the header. Shows count: "Archive 12 done tasks". Opens confirmation dialog: "Move 12 tasks older than 90 days to ARCHIVE.md?" Confirm triggers `POST /api/archive` API.
  - [ ] **API endpoint** — `POST /api/archive` with optional `?olderThan=30` param. Returns `{ archived: 12, file: "ARCHIVE.md", skipped: [{title, reason}] }`. Writes both TODO.md (with cards removed) and ARCHIVE.md (with cards appended).
  - [ ] **Durable undo** — Store removed cards in `.kanban-archive-undo.json` in the project directory (not server memory — survives restarts). Cleared after 7 days or on next successful archive. `POST /api/archive/undo` reads the file and restores cards. `Ctrl+Z` in the UI triggers this endpoint.
  - [ ] **Dependency guard** — Before archiving a done card, check if any non-done cards have `blocked-by` pointing to it (requires Card Dependencies feature #3). If so, skip that card and include it in `skipped` array: `{title: "Fix login", reason: "blocking active cards"}`.
  - [ ] **Tests** — 5 cases: archive removes old done cards, preserves recent done cards, @archive after: config works, ARCHIVE.md is valid markdown format, undo restores cards from .kanban-archive-undo.json
  - [ ] **HelpDialog + README** — Document `@archive` preamble config, CLI command, header button, undo behavior
- [ ] **Import from other tools** — `md-kanban import --from github-issues owner/repo` converts external data sources to TODO.md format. Lowers the barrier to trying md-kanban. #polish
  - [ ] **Import framework** — `lib/importer.js`: pluggable importers. Each importer is a `{ name, describe(), import(options) → BoardState }` module. Importer modules live in `lib/importers/`.
  - [ ] **GitHub Issues importer** — `lib/importers/github-issues.js`: uses GitHub REST API (no auth for public repos, `GITHUB_TOKEN` env var for private). Paginates via Link headers (handles 100+ issues). `--state open|closed|all` flag (default: all). Maps: open issues → To Do column, closed → Done column, labels → #tags, milestone → separate column, assignees → @mentions, body → description (truncated to 500 chars with "...[full issue]" appended). Rate-limited with spinner feedback.
  - [ ] **CSV importer** — `lib/importers/csv.js`: reads CSV from stdin or `--file`. Columns: `column, title, description, done, tags, due_date`. Maps to BoardState columns and cards. Handles quoted fields with embedded commas and newlines.
  - [ ] **Trello JSON importer** — `lib/importers/trello.js`: reads Trello board export JSON. Lists → columns, cards → cards with checklist items as sub-tasks, labels → #tags, due dates → due:YYYY-MM-DD, description preserved.
  - [ ] **CLI** — `md-kanban import --from <source> [--file <input>] [--output <path>] [--state open|closed|all]`. Writes to `./TODO.md` by default. `--dry-run` prints what would be imported without writing. `--force` overwrites existing TODO.md.
  - [ ] **Tests** — 3 cases: GitHub importer maps issue to card correctly (open → To Do, closed → Done), CSV importer round-trips through parser, Trello checklist items become sub-tasks
  - [ ] **HelpDialog + README** — Document `md-kanban import` with examples for each source
- [ ] **Recurring cards** — `@recur weekly` or `@recur first-monday` syntax auto-creates a fresh copy when the card is checked done. The done card stays in Done; a new unchecked copy appears in the original column with an updated due date. Small feature, big habit-building impact. #polish
  - [ ] **Parser** — `parseCardLine()` recognizes `@recur daily|weekly|biweekly|monthly|first-monday|last-friday` at end of description. Stores as `card.recur: string`. The `@recur` annotation survives round-trips via rawLine.
  - [ ] **Recur logic** — `lib/recur.js`: given a card with `recur` rule and a `done` date (today when toggled), compute the next due date. `daily` → +1 day, `weekly` → +7 days, `biweekly` → +14 days, `monthly` → +1 month, `first-monday` → next first Monday of the month. Also bumps `due:YYYY-MM-DD` if present on the new copy.
  - [ ] **Server toggle handler** — When a recurring card is toggled done: (1) deep-clone the card including all children/sub-tasks (all set to undone), (2) clear `blockedBy` to empty and set `createdAt` to today on the new copy, (3) compute next due date via recur logic and update `due:YYYY-MM-DD` if the template had one, (4) append `<!-- recurring from: <original-id> -->` comment to new card's rawLine. The original stays done in its column.
  - [ ] **KanbanCard indicator** — Cards with `recur` show a small refresh/cycle icon (Refresh or Repeat) next to the due date badge. Tooltip: "Repeats weekly. Checking this done creates the next occurrence."
  - [ ] **EditCardDialog** — Recurrence dropdown: None / Daily / Weekly / Biweekly / Monthly / First Monday / Last Friday. Changing the value updates the `@recur` annotation on the raw line.
  - [ ] **Edge case: manual uncheck** — If user unchecks a recurring card (without deleting the original done copy), the recurrence does NOT fire again. Only fires on the transition from unchecked → checked. Prevents duplicate creation.
  - [ ] **Tests** — 5 cases: parser extracts @recur, weekly recur computes next date, server creates copy on toggle (deep-clone verified), indicator renders on card, manual uncheck doesn't duplicate
  - [ ] **HelpDialog + README** — Document `@recur` syntax, supported intervals, behavior on toggle

  > ⚡ **Implementation order note**: The 9 features above have soft dependencies. Filter Bar "Stale" preset needs Card Staleness (#6) done first. Archive dependency guard (#7) needs Card Dependencies (#3) done first. Keyboard Move Cards (#4) and Markdown Preview (#5) are fully independent — good warm-up tasks.

## In Progress
- [ ] **Git integration (opt-in)** — --git flag that auto-commits TODO.md changes with meaningful messages (md-kanban: moved "Fix login" → In Progress). Respects user's git config. Off by default. #polish
  - [ ] **Git detection** — On server start, check if TODO.md is inside a git repo (`git rev-parse --show-toplevel`). Store `gitRoot` in server state. If not in a repo, --git flag prints warning and proceeds without git.
  - [ ] **Commit message builder** — Map each API action to a human-readable message: CARD_ADD → `added "Task title" to Column Name`, CARD_MOVE → `moved "Task title" → Column Name`, CARD_EDIT → `updated "Task title"`, CARD_DELETE → `removed "Task title"`, CARD_TOGGLE → `marked "Task title" as done/undone`. Truncate titles over 60 chars.
  - [ ] **Debounced commits** — Batch rapid changes (e.g., drag + undo + redo within 2 seconds) into a single commit. Use a 2-second debounce timer after the last mutation. Commit message lists all actions: `md-kanban: moved "X" → Done, added "Y" to To Do`.
  - [ ] **CLI flag** — `--git` enables auto-commit. `--git-message-prefix "custom:"` overrides default "md-kanban:" prefix. Respect `user.name` and `user.email` from git config — never override.
  - [ ] **Error handling** — If git commit fails (merge conflict, detached HEAD, permission), show toast but never block the mutation. The file write still succeeds; only the commit is skipped. Log error to server console.
  - [ ] **Tests** — 4 cases: commit message format for each action type, debounce batches multiple changes, --git in non-repo prints warning, failed commit doesn't block file write
  - [ ] **HelpDialog + README** — Document --git flag, message format, debounce behavior


## Done
- [x] **Markdown rendering in descriptions** — Render inline markdown in card descriptions: [links](url), `code`, *italic*, **bold**. Zero format change — TODO.md is already markdown. #critical <!-- pinned -- >
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
- [x] **Expanded keyboard shortcuts** — Vim-style navigation: j/k navigate cards, Enter opens edit dialog, Space toggles done, d deletes, c creates new card in current column, Cmd+K opens command palette. #important
  - [x] **Focused card concept** — Add a `focusedCardId` state to BoardShell. The focused card gets a ring highlight (`ring-2 ring-primary`). j/k move focus up/down through visible cards in the current column. Wrapping: j at last card moves to first card of next column; k at first card moves to last card of previous column.
  - [x] **Action shortcuts on focused card** — `Enter` → opens EditCardDialog for the focused card. `Space` → toggles done/undone. `d` → opens delete confirmation dialog (or delete immediately if confirmation is off). `e` → opens EditCardDialog (alias for Enter). `p` → toggles pin/unpin.
  - [x] **Creation shortcut** — `c` focuses the AddCardForm input of the currently focused card's column. If no card is focused, focuses the first column's AddCardForm. `Escape` blurs the input and clears focus.
  - [x] **Search shortcut** — `Cmd+K` / `Ctrl+K` already works. Ensure focused card is restored after dismissing CommandPalette.
  - [x] **Global shortcuts** — `Ctrl+Z` / `Ctrl+Shift+Z` for undo/redo (already done). `n` focuses first column's AddCardForm (already done). `?` opens HelpDialog (already done).
  - [x] **HelpDialog update** — Add full keyboard shortcut reference table including all new vim-style bindings. Group by: Navigation, Card Actions, Creation, Global.
  - [x] **Tests** — 10 cases: getFlatCards (5) + findParentId (5) covering flattening, sub-tasks, wrapping, parent lookup, edge cases
- [x] **Export** — GET /api/board/export?format=json|csv. CSV for spreadsheet users. Optional static HTML export for sharing a snapshot. #polish
  - [x] **JSON export** — `GET /api/board/export?format=json` returns the full BoardState with all card fields (id, title, description, done, children, dueDate, assignees, tags, createdAt, pinned, warning). Already close to GET /api/board — just ensure completeness.
  - [x] **CSV export** — `GET /api/board/export?format=csv` returns `text/csv`. Columns: column, title, description, done, due_date, assignees, tags, created_at. Flatten sub-tasks as separate rows with "parent_title" column. Handle commas and quotes in descriptions.
  - [x] **Static HTML export** — `GET /api/board/export?format=html` returns a self-contained HTML file. Inline all CSS (Appica tokens as custom properties + minimal layout). Render columns as styled divs, cards as styled blocks with checkbox state. No JavaScript — pure snapshot. Add "Exported at" timestamp in footer.
  - [x] **Export button in UI** — Add a download button to the header (Download icon) that opens a dropdown: "Export as JSON", "Export as CSV", "Export as HTML". Uses the current board's file param.
  - [x] **Tests** — 4 cases: JSON matches BoardState shape, CSV has correct headers + escaping, HTML is valid + self-contained, export button triggers correct download
  - [x] **HelpDialog + README** — Document export formats, API endpoint, UI button
- [x] **Demo: overdue** — Verify overdue date renders with red badge. This card has due:2025-01-15 (past). #polish
  - [x] **KanbanCard** — Shows red "Overdue" badge (past-date color). Badge uses warning/error styling to stand out.
  - [x] **CommandPalette** — This card appears when filtering by due date. Overdue badge visible in results.
  - [x] **Sort order** — When multiple cards have due dates, overdue cards sort first within their column.
- [x] **Demo: due date** — Verify upcoming due date renders correctly. This card has due:2026-08-15. #polish #critical
  - [x] **KanbanCard** — Shows a blue badge "Due Aug 15" (upcoming color). Badge is visible immediately, not just on hover.
  - [x] **EditCardDialog** — Date picker pre-filled with 2026-08-15. Changing date updates badge color in real-time.
  - [x] **CommandPalette** — "Due Soon" filter includes this card (within 7 days of due date as date approaches).
- [x] **Test due soon** — Test due soon — due:2026-08-01 <!-- created:2026-07-31 -- >
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
- [x] **Demo: assignees** — Verify the assignees plugin renders correctly in all views. This card has @alice and @bob assigned. #polish
  - [x] **KanbanCard** — Colored initial chips Ⓐ Ⓑ appear next to tags. Hover shows "Alice" / "Bob" via Tooltip. Colors match @assignees config or auto-assigned palette.
  - [x] **EditCardDialog** — Assignee section shows @alice and @bob as toggle chips. Quick-toggle buttons appear for both.
  - [x] **CommandPalette** — Searching "alice" finds this card. Assignee chips visible in results.
- [x] **Card pinning** — Pin cards to the top of their column. Hover-revealed pin icon. Pinned cards sort above unpinned, most recently pinned first. Unpins on drag below pinned section. `` comment in rawLine. #important
  - [x] **Parser/writer** — recognize `<!-- pinned -- >` in rawLine → `card.pinned`, append on serialize
  - [x] **Server** — PUT /api/cards/:id accepts `{ pinned: true/false }`
  - [x] **Reducer** — CARD_TOGGLE_PIN action + Card.pinned type
  - [x] **Column.tsx** — sort pinned cards first, unpin on drop below pinned zone
  - [x] **KanbanCard** — hover-revealed pin icon (Pinned/Pin from Appica), amber when active
  - [x] **CommandPalette** — pin indicator (📌) in search results
  - [x] **useBoard** — togglePin() mutation through API
- [!] **Assignee support** — Parse @username mentions in descriptions via `@assignees` preamble config. Render as colored initial chips (Ⓐ Alice) in KanbanCard. Type `@username` in description to assign, quick-toggle in EditCardDialog. @important #important
  - [x] **assignees plugin** — `lib/builtin/assignees.js`: extracts @username → card.assignees[], strips from display description
  - [x] **Preamble config** — parser reads `@assignees` JSON for display names + colors, auto-colors unknown users
  - [x] **KanbanCard** — render assignee initials chips next to tags, hover shows name via Tooltip
  - [x] **EditCardDialog** — assignee section: type `@name` to add, quick-toggle buttons for known users
  - [x] **card-utils** — `extractAssignees()`, `getAssigneeDef()`, `formatInitials()` helpers
  - [x] **Types/docs** — `assignees?: string[]` on Card, HelpDialog/README/FORMAT_GUIDE updated
- [x] **Due dates** — Extend the existing due-dates plugin: support 📅 YYYY-MM-DD alt syntax, add "Due Soon" filter to CommandPalette, overdue red badge polish. #critical
  - [x] **📅 emoji syntax** — Extend due-dates plugin parseCard() to also match `📅 YYYY-MM-DD` in descriptions (current: only `due:YYYY-MM-DD`). Regex: `/due:\d{4}-\d{2}-\d{2}|📅\s*\d{4}-\d{2}-\d{2}/i`
  - [x] **"Due Soon" filter in CommandPalette** — Add a filter chip/button in the CommandPalette that narrows results to cards with a due date within the next 7 days. Use existing `flattenBoard` data — just add a `filterDueSoon` toggle.
  - [x] **Overdue badge polish** — Verify overdue cards show red badge in all views (KanbanCard, EditCardDialog, CommandPalette results). Add a subtle pulse animation to overdue badges to draw attention.
  - [x] **Tests** — 4 test cases: parseCard with 📅 syntax, parseCard with mixed formats, CommandPalette filter integration, badge rendering in KanbanCard
  - [x] **HelpDialog** — Update keyboard shortcuts + features table with "Due Soon (Cmd+Shift+D)" entry
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
- [x] **Plugin system for parser extensions** — Hook-based middleware at parse/serialize points. Configured via `@plugins` block in preamble. Ships with due-dates and warning-cards plugins. Users can drop `.js` files in `~/md-kanban/plugins/`. #polish
  - [x] **Plugin API** — `lib/plugin-runner.js`: loads named plugins from config, calls `parseCard()` and `serializeCard()` hooks per card
  - [x] **Preamble config** — parser reads `@plugins due-dates, warning-cards` from HTML comment block
  - [x] **due-dates plugin** — extracts `due:YYYY-MM-DD` from descriptions → `card.dueDate`, date picker in EditCardDialog, colored badge in KanbanCard
  - [x] **warning-cards plugin** — recognizes `- [!] **Title**` syntax → `card.warning = true`, amber left border, warning toggle in EditCardDialog
  - [x] **User plugin dir** — autoload `.js` files from `<project>/.kanban/plugins/` or `~/md-kanban/plugins/`
  - [x] **KanbanCard styling** — warning cards get amber left border, overdue cards get red/amber/blue badge
  - [x] **Docs update** — HelpDialog, README, design.md, FORMAT_GUIDE updated with plugin docs and new syntax
- [x] **Demo: warning card** — Verify - [!] syntax renders amber left border. This card uses - [!] syntax. #polish
  - [x] **KanbanCard** — Amber 3px left border via `border-l-[3px] border-l-amber-500` (or Appica warning token). Visible at all times, not just on hover.
  - [x] **EditCardDialog** — Warning toggle switch is ON. Toggling off changes - [!] back to - [ ] in the file.
  - [x] **CommandPalette** — Warning indicator (⚠ or amber dot) visible in search results for this card.
- [x] **Custom scrollbars via CSS** — Replace browser-default scrollbars with thin, themed scrollbars using CSS pseudo-elements. Uses `::-webkit-scrollbar` (Webkit) and `scrollbar-width: thin` (Firefox). Avoids Appica UI ScrollArea component's DOM layer issues. #polish
  - [x] **Global scrollbar styles** — Add `::-webkit-scrollbar` rules in index.css: 6px width, transparent track, `var(--background-strong)` rounded thumb.
  - [x] **Auto-hide variant** — Add `.kanban-scroll-area` class with transparent-default thumb that reveals on hover (150ms transition).
  - [x] **Column component** — Add `kanban-scroll-area` class to the cards overflow div.
  - [x] **design.md update** — Document CSS approach, selector table, code examples.
  - [x] **Visual verification** — Confirm thin rounded scrollbar in both light/dark modes. Check auto-hide behavior in columns.
- [x] **Board templates** — md-kanban init --template bug-tracker scaffolds a TODO.md with preset columns + example cards. Ship 4 templates: Kanban (default), Bug Tracker, Sprint Planning, Reading List. No emojis — column names are plain text, Appica icons assigned via columnIcon() mapping. #polish
  - [x] **Template format** — JSON template schema in `lib/templates/`: `{ name, title, description, columns: [{ name, cards: [{ title, description, tags, children, done }] }] }`. `lib/templates.js` provides loadTemplate(), listTemplates(), renderTemplate() with FORMAT_GUIDE preamble auto-prepend.
  - [x] **Kanban template** — Default 3-column board: To Do, In Progress, Done. 7 root cards + 8 sub-tasks demonstrating tags, due dates, assignees, and nested children.
  - [x] **Bug Tracker template** — 4 columns: Reported, Triaging, Fixing, Resolved. 9 root cards with #bug tags, reproduction steps, severity labels, and sub-tasks.
  - [x] **Sprint Planning template** — 5 columns: Backlog, This Sprint, In Progress, Review, Done. 10 root cards with story points, #feature/#backend tags, and multi-level sub-tasks.
  - [x] **Reading List template** — 3 columns: To Read, Reading, Finished. 8 root cards with author info, ratings, chapter tracking sub-tasks.
  - [x] **CLI integration** — `md-kanban init --template <name>` writes template to ./TODO.md. `--force` overwrites existing file (required if TODO.md exists). `--list` prints available templates. `--help` shows usage.
  - [x] **Column icon mappings** — Added Bug/Search/Wrench/Rocket/Bookmark/Eye/Book2/BookFilled to columnIcon() in Column.tsx for all new template column names.
  - [x] **HelpDialog** — Added "Templates" feature entry with LayoutKanban icon showing `md-kanban init --template` usage + available template names.
  - [x] **Documentation** — README.md: added Board Templates section with table, usage, and JSON schema. design.md: updated Icons table with full columnIcon() mapping, added Templates section.
  - [x] **Tests** — 10 cases in lib/templates.test.js: loadTemplate for all 4 templates + invalid, listTemplates, renderTemplate round-trip, sub-tasks, tags, all-parse validation.
