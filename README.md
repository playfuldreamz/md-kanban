# kanban-md — Architecture Specification

## Overview

**kanban-md** is a lightweight CLI tool that renders any `TODO.md` as an interactive Kanban board in the browser. Columns map to `##` markdown sections; cards map to `- [ ]` / `- [x]` list items. Edits in the browser write back to the file. File changes (git pull, external editor) push to the browser via WebSocket. The file is always the source of truth — closing the tab loses nothing.

**Install footprint**: ~2MB (chokidar + express + ws + pre-built React app).  
**Runtime**: `npx kanban-md` in any project with a `TODO.md`.  
**Frontend**: Appica UI components on React 19 + Tailwind CSS v4, built with Vite and shipped as static assets inside the package.

---

## Table of Contents

1. [Rationale](#rationale)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [TODO.md Schema](#todomd-schema)
5. [API Surface](#api-surface)
6. [Frontend Component Tree](#frontend-component-tree)
7. [Sync Protocol](#sync-protocol)
8. [Failure Modes](#failure-modes)
9. [Implementation Sequence](#implementation-sequence)

---

## Rationale

TODO.md is the universal project task list — every repo has one, every developer knows the format. But a flat Markdown file is a poor interaction surface for re-prioritizing, reordering, and tracking progress. Existing solutions (GitHub Projects, Trello, Notion) require leaving the editor, paying for a service, or syncing data to a third party.

kanban-md bridges the gap: the file stays a plain Markdown file (git-friendly, editor-agnostic), but you get a live Kanban board when you want it. No accounts, no databases, no external services. The CLI is the only runtime dependency.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Terminal                                         │
│  $ npx kanban-md                                  │
│  → Reads ./TODO.md                                │
│  → Spins up Express + WebSocket on :3456          │
│  → Opens browser                                  │
│  → Watches file via chokidar                      │
└──────────────────┬───────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
┌───────────────┐    ┌──────────────────────────┐
│  Express API  │    │  WebSocket Server (ws)    │
│  (REST)       │    │                           │
│               │    │  Broadcasts on:           │
│  GET  /api/   │◄───│  - File change detected   │
│       board   │    │  - Board mutation via API │
│               │    │                           │
│  POST /api/   │    │  Message: { type: 'sync', │
│       cards   │    │    board: BoardState }     │
│               │    │                           │
│  PUT  /api/   │    │                           │
│       cards/  │    │                           │
│       :id     │    │                           │
│               │    │                           │
│  PUT  /api/   │    │                           │
│       reorder │    │                           │
└──────┬────────┘    └──────────┬───────────────┘
       │                        │
       │  ┌─────────────────────┘
       │  │
       ▼  ▼
┌──────────────────────────────────────────────────┐
│  Parser / Writer (lib/)                           │
│                                                   │
│  parseMarkdown(todoMd: string) → BoardState       │
│  serializeBoard(board: BoardState) → string       │
│                                                   │
│  BoardState = {                                   │
│    title: string,                                 │
│    columns: Column[]                              │
│  }                                                │
│  Column = {                                       │
│    id: string,          // slug from header       │
│    name: string,        // raw header text        │
│    emoji: string|null,  // leading emoji if any   │
│    cards: Card[]                                  │
│  }                                                │
│  Card = {                                         │
│    id: string,           // stable hash           │
│    done: boolean,                                 │
│    title: string,        // **bold** text         │
│    description: string,  // after —               │
│    rawLine: string,      // original markdown line│
│    children?: Card[],    // nested sub-tasks       │
│  }                                                │
└──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│  TODO.md (file system)                            │
│  Watched by chokidar.                             │
│  Every API mutation → rewrite file → chokidar     │
│  fires → WebSocket broadcasts new state.          │
└──────────────────────────────────────────────────┘
```

### Why Express + ws and not just Vite?

Vite's dev server is a build tool, not an application server. We need:
- A file-system watcher (chokidar)
- A WebSocket server for push sync
- REST endpoints that read/write the file

Express gives us all three with minimal code. The React frontend is pre-built and served as static files from Express — Vite is only used at package build time, not at runtime.

### Why WebSocket and not polling?

Polling a file stat every N seconds burns CPU for no reason when nothing changes. chokidar tells us exactly when the file changed. WebSocket pushes that event to the browser in ~1ms. The alternative (SSE) works but is one-directional; WebSocket also lets the browser signal back (e.g., "I'm about to edit, hold syncs").

### Multi-file support

Pass `--file` multiple times or use `--dir <path>` to watch a directory of `.md` files. The server tracks a `Map<filePath, BoardState>`, one chokidar watcher per file. WebSocket messages include the `file` field so the frontend routes updates to the correct board. All REST routes accept `?file=` to target a specific board; `GET /api/files` returns the list of watched files. The frontend shows a file-switcher dropdown in the header when multiple files are registered.

---

## Data Model

### BoardState (in-memory, derived from file)

```typescript
interface BoardState {
  title: string;            // from `# TITLE` line, or filename
  columns: Column[];
}

interface Column {
  id: string;               // slugified header (e.g. "critical", "important")
  name: string;             // raw text after ## (e.g. "🔴 Critical")
  emoji: string | null;     // leading emoji extracted from name
  cards: Card[];
}

interface Card {
  id: string;               // stable hash: djb2(title + column) for drag tracking
  done: boolean;            // - [x] vs - [ ]
  title: string;            // text inside **...**, or first sentence
  description: string;      // text after — (em dash), or empty
  rawLine: string;          // the original line, preserved for round-trip fidelity
  children?: Card[];        // recursively nested sub-tasks (indented checkboxes)
}
```

### ID Stability

Card IDs must survive renames and reorders. We hash `(title + column name)` via a simple DJB2 — not crypto-secure, but collision-resistant enough for a personal task board. If a card title changes, the old ID is gone and the frontend treats it as a delete + add. This is acceptable because cards are rarely renamed mid-session.

### Column Ordering

Columns appear in file order. The first `##` section is the leftmost column. Cards within a column appear in file order (top = top of column). The "Done" state of a card is orthogonal to its column — done cards stay in their column, just rendered with a strikethrough and muted styling.

---

## TODO.md Schema

The parser enforces a lightweight schema. Files that don't match get a clear error message.

### Canonical format

```markdown
# Project Name

## 🔴 Critical
- [ ] **Fix login bug** — Users on Safari get a blank screen after OAuth redirect
- [x] **Rate limiting** — Added express-rate-limit middleware

## 🟡 Important
- [ ] **i18n extraction** — Phase 2, batch 3: admin panel strings
- [ ] **Notifications delivery** — Backend push/email/in-app system

## 🟢 Polish
- [ ] **Landing page** — App goes straight to login, no public page
- [ ] **Accessibility audit** — No systematic ARIA labels or keyboard nav testing
```

### Parsing rules

| Mark | What it becomes |
|------|----------------|
| `# TEXT` | Board title. Only the first H1 is used. |
| `## TEXT` | Column. Every H2 becomes a board column. |
| `- [ ] **TITLE** — DESC` | Open card. Title is bold text, description follows em dash. |
| `- [x] **TITLE** — DESC` | Done card. Same structure, `done: true`. |
| `- [ ] TITLE — DESC` | Card without bold title — entire text before `—` becomes title. |
| `- [ ] TITLE` | Card with no description — description is empty string. |
| Anything else | Ignored (paragraphs, code blocks, HTML comments). |

### What breaks parsing

- Using `###` (H3) for columns — only H2s create columns
- Cards outside any H2 section — they're collected under an "Uncategorized" column

### Sub-tasks

Indented checkboxes (`  - [ ]`) become nested sub-tasks. Unlimited depth in the data model; the UI renders up to 4 visual levels with collapsible progress badges (e.g. "▾ 2/5").

```markdown
- [ ] **Auth system** — OAuth + JWT
  - [x] Google provider
  - [ ] GitHub provider
```

### Round-trip fidelity

The parser preserves `rawLine` for every card. When serializing, if a card hasn't changed its title/description/done state, the original line is written back verbatim. Only mutated cards get new lines. This means:
- Manual formatting (spacing, inline code, links) survives untouched
- Cards edited in the browser get canonical formatting on save
- The file diff is minimal — only changed lines

---

## API Surface

All endpoints are localhost-only (127.0.0.1). No authentication. The server binds only to loopback. All routes accept an optional `?file=<absolute-path>` query parameter to target a specific board when multiple files are watched. If omitted, the first registered file is used.

### `GET /api/files`
Returns the list of watched files.

**Response 200:**
```json
[
  { "file": "/abs/path/TODO.md", "title": "My Project", "columns": 3, "cards": 12 },
  { "file": "/abs/path/NOTES.md", "title": "Meeting Notes", "columns": 2, "cards": 5 }
]
```

### `GET /api/board`
Returns the full parsed board state. Accepts `?file=` to select which board.

**Response 200:**
```json
{
  "title": "Project Name",
  "columns": [
    {
      "id": "critical",
      "name": "🔴 Critical",
      "emoji": "🔴",
      "cards": [
        {
          "id": "a1b2c3",
          "done": false,
          "title": "Fix login bug",
          "description": "Users on Safari get a blank screen after OAuth redirect"
        }
      ]
    }
  ]
}
```

### `POST /api/cards`
Add a card to a column.

**Body:** `{ "columnId": "critical", "title": "New task", "description": "Optional" }`  
**Response 201:** The created card object.

### `PUT /api/cards/:id`
Update a card's title, description, done state, and/or children.

**Body:** `{ "title": "...", "description": "...", "done": true, "children": [...] }`  
**Response 200:** The updated card object.

### `PUT /api/cards/:id/move`
Move a card to a different column and/or position.

**Body:** `{ "columnId": "important", "index": 2 }`  
**Response 200:** `{ "ok": true }`

### `DELETE /api/cards/:id`
Remove a card entirely.

**Response 200:** `{ "ok": true }`

### WebSocket `ws://127.0.0.1:3456`
Server pushes `{ type: "sync", board: BoardState }` on every file change or API mutation. Client connects on page load and reconnects on disconnect. No client→server messages in v1.

---

## Frontend Component Tree

```
<App>
  <ThemeProvider>                 ← Appica UI dark mode
    <BoardShell>                  ← chrome: header, search, column count
      <CommandPalette />          ← Cmd+K search across all tasks
      <ColumnList>                ← horizontal flex, overflow-x-auto
        <Column>                  ← Appica UI Card with header
          <ColumnHeader>          ← emoji + name + card count badge
            <Badge />             ← Appica UI Badge
          </ColumnHeader>
          <SortableCardList>      ← drop target
            <KanbanCard>          ← Appica UI Card variant
              <Checkbox />        ← Appica UI Checkbox
              <Button />          ← Appica UI ghost button (edit/delete)
              <SubTaskSection>    ← collapsible sub-task list + progress badge
                <SubTaskItem>     ← recursive: checkbox + title + delete
                  <SubTaskSection />  ← nested children (up to 4 levels)
                </SubTaskItem>
                <AddSubTaskInline />  ← inline input at each nestable level
              </SubTaskSection>
            </KanbanCard>
          </SortableCardList>
          <AddCardForm>           ← inline form at column bottom
            <Input />             ← Appica UI Input
            <Button />            ← Appica UI primary button
          </AddCardForm>
        </Column>
      </ColumnList>
    </BoardShell>
  </ThemeProvider>
</App>
```

### Drag and Drop

Uses HTML5 Drag and Drop API (no library). Cards are `draggable`. Columns are drop zones. On drop:
1. Optimistic UI update (move card in local state)
2. `PUT /api/cards/:id/move` fires
3. Server rewrites file → chokidar fires → WebSocket pushes full state
4. Frontend reconciles — if server state differs from optimistic state, server wins

This "server wins" reconciliation prevents the common drag-and-drop bug where two clients (or a file edit mid-drag) produce conflicting states.

### State Management

No state library. A single `useReducer` in `BoardShell` holds the full board state. Actions:
- `BOARD_SYNC` — replace entire state (from WebSocket or initial fetch)
- `CARD_TOGGLE` — optimistic checkbox toggle
- `CARD_MOVE` — optimistic drag move
- `CARD_ADD` — optimistic new card
- `CARD_EDIT` — optimistic title/description edit
- `CARD_DELETE` — optimistic removal
- `SUBTASK_TOGGLE` — toggle a sub-task's done state
- `SUBTASK_ADD` — add a sub-task to a card
- `SUBTASK_EDIT` — edit a sub-task's title and description
- `SUBTASK_DELETE` — remove a sub-task

### Search

Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to open the command palette. Type to filter all cards — including sub-tasks — by title, description, tag (`#critical`), or column name. Arrow keys navigate results; Enter scrolls to and briefly highlights the selected card. Escape or click-outside dismisses. A search button with the shortcut hint is also available in the header bar.

Every optimistic action fires an API call. The WebSocket sync that follows acts as the "truth reconciliation" step.

---

## Sync Protocol

### Direction 1: UI → File

```
User drags card
  → React state updates optimistically
  → PUT /api/cards/:id/move
    → server/lib/writer.js serializes full board
    → fs.writeFileSync(TODO.md, newContent)
      → chokidar detects change
        → ws.broadcast({ type: 'sync', board })
          → React reducer replaces state with server state
```

The chokidar round-trip is intentional. It ensures the file on disk matches what the server thinks is there. If a write fails (disk full, permissions), the API returns 500 and the frontend reverts the optimistic update.

### Direction 2: File → UI

```
User saves TODO.md in VS Code
  → chokidar detects change (50ms debounce)
    → parser.parseMarkdown(fs.readFileSync(...))
    → ws.broadcast({ type: 'sync', board })
      → React reducer replaces state
```

The 50ms debounce prevents double-parses when editors do write-and-rename atomic saves.

### Conflict Handling

If the file changes while the user is dragging (unlikely but possible):
1. WebSocket sync fires mid-drag
2. State is replaced — the drag ends (card snaps back)
3. User sees the new state immediately
4. They can re-initiate the drag

This is acceptable for a personal tool. Multi-user sync is explicitly out of scope.

---

## Failure Modes

| Failure | Behavior | Recovery |
|---------|----------|----------|
| TODO.md not found | Server starts, frontend shows "No TODO.md found in this directory — create one?" with a button that seeds an empty board | User creates file, hits refresh |
| TODO.md has no H2 sections | Parser creates a single "Tasks" column with all cards | User adds `##` headers |
| TODO.md is malformed Markdown | Parser extracts whatever it can; unrecognized lines are ignored | Fix the file |
| Port 3456 in use | CLI tries 3457, 3458, 3459; if all busy, prints error and exits | User kills other process or passes `--port` |
| Disk full on write | API returns 500; frontend reverts optimistic update and shows toast | Free disk space |
| File deleted while server runs | chokidar emits `unlink`; server keeps last-known state in memory; frontend shows warning banner "TODO.md was deleted — save to recreate" | User recreates file |
| Browser tab closed | Nothing lost — file is source of truth | Re-open browser at localhost:3456 |
| WebSocket disconnects | Client retries every 2s with exponential backoff (max 30s) | Auto-reconnect |

---

## Implementation Sequence

See [PLAN.md](./PLAN.md) for the phased implementation checklist.

### Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **1** | Parser + Writer | `lib/parser.js` and `lib/writer.js` with tests |
| **2** | Express server + WebSocket | `server.js` with all REST endpoints and live sync |
| **3** | React frontend (read-only) | Board displays columns and cards, synced via WebSocket |
| **4** | Mutations (checkbox, add, edit, delete) | Full CRUD from the browser |
| **5** | Drag and drop | HTML5 DnD between columns |
| **6** | CLI packaging | `bin` entry, `npx` support, auto-open browser |
| **7** | Polish & tests | Error states, empty states, accessibility pass |
