# kanban-md — Implementation Plan

## Phase Overview

| Phase | Goal | Files | Status |
|-------|------|-------|--------|
| **1** | Parser + Writer | `lib/parser.js`, `lib/writer.js`, `lib/parser.test.js` | ✅ Done |
| **2** | Express + WebSocket server | `server.js` | ✅ Done |
| **3** | React frontend (read-only board) | `client/src/*` | ✅ Done |
| **4** | Mutations (CRUD from browser) | `client/src/hooks/useTodoApi.ts`, API wiring | ✅ Done |
| **5** | Drag and drop | `client/src/components/SortableCardList.tsx` | ✅ Done |
| **6** | CLI packaging | `package.json` bin, build scripts | ✅ Done |
| **7** | Polish & tests | Error states, empty states, a11y | ✅ Done |

---

## Phase 1 — Parser + Writer

**Goal**: Reliably parse any well-formed TODO.md into `BoardState` JSON, and serialize back to Markdown with minimal diffs.

### Files
- `lib/parser.js` — `parseMarkdown(text: string) → BoardState`
- `lib/writer.js` — `serializeBoard(board: BoardState) → string`
- `lib/types.js` — JSDoc type definitions (no TypeScript build step for the server)

### Checklist

- [x] Parse `# TITLE` → board title
- [x] Parse `## SECTION` → column (extract emoji if present)
- [x] Parse `- [ ] **Title** — Description` → card with `done: false`
- [x] Parse `- [x] **Title** — Description` → card with `done: true`
- [x] Parse `- [ ] Title` (no bold, no description) → card
- [x] Generate stable card IDs via hash of `title + columnName`
- [x] Preserve `rawLine` for every card
- [x] Round-trip: serialize → parse → identical BoardState
- [x] Minimal diff: unchanged cards write `rawLine` verbatim
- [x] Handle edge cases: empty file, no H2s, cards outside sections
- [x] Unit tests: 43 cases covering all parsing + writing rules

### Done signal
```bash
$ node lib/parser.test.js
# All 15+ tests pass
```

---

## Phase 2 — Express + WebSocket Server

**Goal**: Serve the board API, watch the file, push changes to connected browsers.

### Files
- `server.js` — Express app + WebSocket server + chokidar watcher
- (updates to `lib/parser.js` if needed)

### Checklist

- [x] `GET /api/board` — reads file, parses, returns JSON
- [x] `POST /api/cards` — adds card to column, rewrites file
- [x] `PUT /api/cards/:id` — updates card fields, rewrites file
- [x] `PUT /api/cards/:id/move` — moves card between/within columns, rewrites file
- [x] `DELETE /api/cards/:id` — removes card, rewrites file
- [x] WebSocket server on same HTTP server (port sharing)
- [x] chokidar watches `./TODO.md` with 50ms debounce
- [x] On file change: re-parse, broadcast `{ type: 'sync', board }` to all clients
- [x] On API mutation: rewrite file → chokidar fires → broadcast
- [x] Serve `client/dist/` as static files (for production)
- [x] CORS: allow localhost origins only
- [x] Port fallback: 3456 → 3457 → 3458 → ... → error after 10 attempts
- [x] Graceful shutdown: close watcher, close WebSocket, close HTTP

### Done signal
```bash
$ node server.js
# HTTP server on :3456
# WebSocket accepting connections
# File changes broadcast to connected browser

$ node lib/server.test.js
# 12 integration tests pass (CRUD, move, file watch, delete)
```

---

## Phase 3 — React Frontend (Read-Only Board)

**Goal**: A browser window showing columns and cards, live-synced via WebSocket.

### Files
- `client/package.json`
- `client/vite.config.ts`
- `client/index.html`
- `client/src/main.tsx`
- `client/src/App.tsx`
- `client/src/components/BoardShell.tsx`
- `client/src/components/ColumnList.tsx`
- `client/src/components/Column.tsx`
- `client/src/components/KanbanCard.tsx`
- `client/src/hooks/useBoard.ts`
- `client/src/hooks/useWebSocket.ts`
- `client/src/reducer.ts`

### Checklist

- [x] Vite + React 19 + TypeScript setup
- [x] Tailwind CSS v4 configured with `@appica/ui-react/styles.css`
- [x] Appica UI `ThemeProvider` wrapping app
- [x] `useWebSocket` hook: connect to `ws://127.0.0.1:3456`, reconnect, parse messages
- [x] `useBoard` hook: useReducer for board state, listen to WebSocket syncs
- [x] `BoardShell`: full-width horizontal scroll container
- [x] `Column`: Appica UI card-like column with header (emoji + name + Badge count)
- [x] `KanbanCard`: card with title + description + checkbox + delete button
- [x] `ColumnList`: maps columns to Column components
- [x] Dark mode toggle (Appica UI `useTheme`)
- [x] Font: system font stack (Appica UI default)
- [x] Loading state: Appica UI Skeleton cards while connecting
- [x] Empty state: "No columns yet" with hint to add ## sections
- [x] Error state: Alert if server unreachable

### Done signal
```
Browser at localhost:3456 shows board with columns and cards.
Editing TODO.md in VS Code updates the browser within ~100ms.
```

---

## Phase 4 — Mutations (CRUD from Browser)

**Goal**: Create, edit, complete, and delete cards from the browser.

### Files
- `client/src/hooks/useTodoApi.ts`
- `client/src/components/AddCardForm.tsx`
- `client/src/components/EditCardDialog.tsx` (or inline edit)
- Updates to `KanbanCard.tsx`

### Checklist

- [x] `useTodoApi` hook: fetch wrapper for all endpoints (integrated into `useBoard`)
- [x] Checkbox toggle on card → PUT /api/cards/:id → optimistic + reconcile
- [x] Add card form at bottom of each column (Appica UI Input + Button)
- [x] Inline title edit on double-click (contentEditable or Input swap)
- [x] Delete button on card (Appica UI ghost Button, with AlertDialog confirmation)
- [x] Optimistic updates for all mutations
- [x] Toast notifications for connection/error status
- [x] Keyboard: Enter to add card, Escape to cancel

### Done signal
```
All CRUD operations work from browser.
File on disk updates correctly.
Undo on error via Toast.
```

---

## Phase 5 — Drag and Drop

**Goal**: Reorder cards within a column and move cards between columns via drag.

### Files
- `client/src/components/SortableCardList.tsx`
- Updates to `KanbanCard.tsx` (draggable attribute)
- Updates to `Column.tsx` (drop zone)

### Checklist

- [x] `KanbanCard`: `draggable="true"`, `onDragStart` sets dataTransfer
- [x] `Column`: `onDragOver` (allow drop), `onDrop` reads card ID + target index
- [x] Visual feedback: card opacity during drag, drop zone highlight (primary border)
- [x] Optimistic reorder on drop
- [x] PUT /api/cards/:id/move on drop (via `onMove` → `moveCard`)
- [x] Handle drop at specific index (calculated from cursor Y position)
- [x] Handle drop on empty column (shows "Drop here" indicator)
- [x] Touch support: mouse-only for v1 (per spec)
- [x] Prevent drag when editing text (draggable disabled during edit)

### Done signal
```
Cards drag between columns and reorder within columns.
Drop saves to file correctly.
```

---

## Phase 6 — CLI Packaging

**Goal**: `npx kanban-md` works end-to-end in any project.

### Files
- `package.json` (root) — bin, scripts, files
- `scripts/build.js` — build client, copy to server dir
- `.npmignore`
- `README.md` (user-facing, short)

### Checklist

- [x] `package.json` `"bin": { "kanban-md": "./server.js" }`
- [x] `package.json` `"files": ["server.js", "lib/parser.js", "lib/writer.js", "client/dist/"]`
- [x] Build script: `cd client && npm run build` → produces `client/dist/`
- [x] Server serves `client/dist/` as static (with SPA fallback)
- [x] Server auto-opens browser on start (`open`/`start`/`xdg-open`)
- [x] CLI args: `--file <path>` (default: `./TODO.md`), `--port <n>` (default: 3456), `--no-open`, `--help`
- [x] `--help` prints usage
- [x] Test: `npm pack` → install → `node server.js` → API + frontend work (scripts/e2e-test.js)
- [x] Works on Windows (tested); macOS/Linux tbd

### Done signal
```bash
$ npx kanban-md --help
# Usage: kanban-md [--file <path>] [--port <n>] [--no-open]
#
# Opens a Kanban board for your TODO.md in the browser.
# Columns are ## sections, cards are - [ ] items.

$ npx kanban-md
# Server on http://localhost:3456
# Browser opens with board
```

---

## Phase 7 — Polish & Tests

**Goal**: Production-quality UX and test coverage.

### Files
- `lib/parser.test.js` (expanded)
- `client/src/__tests__/` (Vitest + React Testing Library)
- Various component updates

### Checklist

- [x] Parser tests: 28 cases covering all edge cases
- [x] Writer tests: 15 cases (round-trip fidelity, minimal diffs, edge cases)
- [x] Server integration tests: 12 cases (CRUD, move, file watch, delete)
- [x] Frontend tests: 17 cases (11 reducer + 6 KanbanCard component)
- [x] Accessibility: checkboxes labeled, columns have aria-labels, delete buttons aria-labeled
- [x] Reduced motion: Appica UI handles via `motion-reduce:transition-none`
- [x] Scroll performance: horizontal scroll for columns, vertical per-column (no virtualization needed)
- [x] Mobile responsive: horizontal scroll columns, cards wrap readable
- [x] Confirmation dialog for delete (Appica UI AlertDialog)
- [x] Keyboard shortcut: `n` to focus first "Add task" input
- [x] Undo toast after delete with 8-second timeout
- [x] favicon (📋 emoji SVG)
- [x] Connection status toast (lost/reconnected)
- [x] Error banner when server unreachable

### Done signal
```bash
$ npm test
# All suites pass

# Manual test:
$ npx kanban-md
# Board loads, all interactions work, keyboard navigable, screen reader friendly
```

---

## Final Checklist

- [x] All 7 phases complete (72 tests, all green)
- [x] `npx kanban-md` works from npm (verified via `scripts/e2e-test.js`)
- [x] Tested on Windows; macOS + Linux pending
- [x] `design.md` matches implementation (Appica UI tokens, components, layout)
- [x] `AGENTS.md` reflects project conventions
- [x] Zero dependencies on NoteAPP — `tools/kanban-md/` is fully self-contained
- [x] Frontend + backend tests pass (`npm test`, `npm run test:server`, `cd client && npx vitest run`)
- [x] Production build succeeds (`npm run build`)
- [ ] Extract to own repo (`github.com/user/kanban-md`) with `git init`, initial commit, push
