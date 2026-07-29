# kanban-md coding rules

> This file governs the `tools/kanban-md/` directory. When this project is extracted
> to its own repo, this becomes the root AGENTS.md.

## What belongs here

- ✅ Rules, constraints, and conventions specific to kanban-md
- ✅ Stack decisions and architecture boundaries
- ✅ Patterns to clone and anti-patterns to avoid
- ✅ Testing requirements

## What does NOT belong

- ❌ Changelogs — those go in git history
- ❌ Completed task checkmarks — those are in PLAN.md
- ❌ Line numbers — use file names and function names

---

## Stack & Conventions

- **Frontend**: React 19 + TypeScript + Appica UI + Tailwind CSS v4, built with Vite
- **Backend**: Node.js (vanilla, no TypeScript) + Express + `ws` + chokidar
- **Design system**: Appica UI exclusively. See `design.md` for component choices and layout.
- **Icons**: `@appica/icons-react` — no other icon library, no emoji in UI chrome
- **Build**: Client is pre-built with Vite and shipped as static files. No Vite at runtime.
- **Tests**: `lib/parser.test.js` (Node built-in test runner or plain assert), `client/src/__tests__/` (Vitest)

## Directory roadmap

```
kanban-md/
  server.js              # Express + WebSocket + chokidar — the CLI entry point
  lib/
    parser.js            # TODO.md → BoardState
    writer.js            # BoardState → TODO.md
    types.js             # JSDoc type definitions
  client/
    index.html           # Vite entry
    vite.config.ts
    tsconfig.json
    src/
      main.tsx           # React root
      App.tsx            # ThemeProvider + BoardShell
      reducer.ts         # useReducer state machine
      components/
        BoardShell.tsx    # Layout chrome
        ColumnList.tsx    # Horizontal scroll container
        Column.tsx        # One Kanban column
        KanbanCard.tsx    # One task card
        AddCardForm.tsx   # Inline add at column bottom
        EditCardDialog.tsx # Edit title/description
      hooks/
        useBoard.ts       # Board state + WebSocket sync
        useWebSocket.ts   # WebSocket connection management
        useTodoApi.ts     # REST API calls
  README.md              # Architecture specification (this is the spec, not user docs)
  PLAN.md                # Phase checklist
  AGENTS.md              # This file
  design.md              # Design system reference
  package.json           # CLI metadata + dependencies
```

## Critical Rules

### 0. File size — never exceed 500 lines

**Every file must stay under 500 lines.** Before editing any file, check its line count. If your planned edits would push it past ~480 lines, **stop and suggest a refactor before writing code.** Split the file into smaller modules — move helper functions to a `lib/` file, extract route handlers into their own module, or break a large component into sub-components.

This is not optional. If a file is over 500 lines after your edits, you have violated this rule and must refactor before the work is considered done.

### 1. Thoroughness before speed

**Never rush to finish a task.** Before writing any code:
1. **Ask clarifying questions** — if anything is ambiguous, ask. Don't guess.
2. **Trace the full data flow** — from user action → frontend → API → server → file → WebSocket → frontend. Verify every hop.
3. **Scope every edge case** — think like the user AND the developer:
   - What happens on first use? Second use?
   - What happens if the API call fails mid-flow?
   - What happens if two operations race?
   - What happens after a page refresh?
   - What happens on a different OS?
4. **Test the full user journey** — not just the happy path. Add, edit, save, refresh, re-open, check persistence.
5. **Verify persistence** — if something is "saved", read the file to prove it.

### 2. The file is ALWAYS the source of truth

Never store state anywhere except the TODO.md file. The server keeps a parsed copy in memory for broadcasting, but every mutation writes through to the file. If the file write fails, the API returns 500 and the frontend reverts its optimistic update. There is no database, no cache file, no `.kanban-state.json`. The file is the database.

### 3. Optimistic UI → API → File → WebSocket → Reconcile

Every mutation follows this exact chain:
```
User action
  → React reducer: optimistic update
  → fetch() to API
    → server writes file
    → chokidar fires
    → WebSocket broadcasts full state
  → React reducer: replace with server state (reconcile)
```

The reconciliation step is critical. The server state always wins. If it differs from the optimistic state (due to a concurrent file edit), the optimistic update is discarded. This prevents drift between the browser and the file.

### 4. Appica UI components ONLY for UI

Every visible element uses Appica UI components. No raw `<button>`, no raw `<input>`, no custom CSS classes beyond Tailwind utilities. The only exception is the drag-and-drop overlay (a semi-transparent clone of the dragged card), which uses raw divs for performance.

### 5. No state library

A single `useReducer` in `BoardShell` holds all state. No Redux, Zustand, Jotai, or Context for board state. The reducer handles 6 action types:
- `BOARD_SYNC` — replace entire state
- `CARD_TOGGLE` — flip done
- `CARD_MOVE` — reposition
- `CARD_ADD` — new card at column end
- `CARD_EDIT` — update title/description
- `CARD_DELETE` — remove

### 6. Dragging uses HTML5 DnD, not a library

No `@dnd-kit`, no `react-beautiful-dnd`. HTML5 Drag and Drop API is sufficient for a single-user Kanban board. Touch support can use a small polyfill if needed, but mouse-first is acceptable for v1.

### 7. The server is vanilla Node.js

No TypeScript on the server side. The server is small enough (~200 lines) that types don't add value. Use JSDoc comments for editor intellisense. The client is TypeScript because React components benefit from prop types.

### 8. Tests for parser are mandatory

The parser is the most critical piece — if it misparses, cards disappear. Minimum 20 test cases covering:
- Every valid input format
- Empty files
- Missing sections
- Malformed cards
- Round-trip fidelity
- Minimal diff output

### 9. Zero dependency on NoteAPP

This directory must be self-contained. It cannot import from `../../backend/` or `../../frontend/`. When extracted, it works standalone. The only shared artifact is the TODO.md format itself.

## Component Patterns (Appica UI)

### Card (KanbanCard)
```tsx
<Card className="cursor-grab active:cursor-grabbing">
  <div className="flex items-start gap-2">
    <Checkbox checked={card.done} onCheckedChange={toggle} />
    <div className="flex-1 min-w-0">
      <p className={cn('text-sm', card.done && 'line-through text-foreground-muted')}>
        {card.title}
      </p>
      {card.description && (
        <p className="text-xs text-foreground-muted mt-0.5">{card.description}</p>
      )}
    </div>
    <Button variant="ghost" size="icon-sm" aria-label="Delete task">
      <Trash />
    </Button>
  </div>
</Card>
```

### Column
```tsx
<Card className="w-72 flex-shrink-0 flex flex-col max-h-full">
  <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
    <span>{column.emoji}</span>
    <span className="text-sm font-medium">{column.name}</span>
    <Badge variant="neutral">{column.cards.length}</Badge>
  </div>
  <div className="flex-1 overflow-y-auto p-2 space-y-2">
    {/* cards + drop zone */}
  </div>
  <AddCardForm columnId={column.id} />
</Card>
```

### Add Card Form
```tsx
<div className="px-2 pb-2">
  <form onSubmit={handleAdd}>
    <Input
      placeholder="Add task..."
      size="sm"
      value={title}
      onChange={e => setTitle(e.target.value)}
    />
  </form>
</div>
```

## Anti-patterns

- ❌ Using a database or JSON file for state — the Markdown file IS the database
- ❌ Skipping the chokidar round-trip after writes — always go file→chokidar→ws→browser
- ❌ Custom CSS classes — use Appica UI components + Tailwind utilities only
- ❌ Importing from NoteAPP — this is self-contained
- ❌ Adding a drag-and-drop library — HTML5 DnD is enough
- ❌ Using `any` in TypeScript — the BoardState types are small and well-defined
- ❌ Skipping optimistic updates — every mutation should feel instant
- ❌ Rushing to finish — every PR must reflect complete user journeys, not isolated features

## Testing

- **Parser tests** (`lib/parser.test.js`): Run with plain Node.js `assert`. Must pass before any server changes.
- **Writer tests** (same file): Round-trip tests with real TODO.md fixtures.
- **Frontend tests** (`client/src/__tests__/`): Vitest + React Testing Library. Test the reducer in isolation. Test components with mock API.
- **Integration test** (manual): Start server, open browser, edit file in VS Code, confirm browser updates. Drag card, confirm file updates.

### Pre-commit checklist
1. `node lib/parser.test.js` — all parser + writer tests pass
2. `cd client && npx vitest run` — all frontend tests pass
3. Manual smoke test: `node server.js` → browser opens → board renders → drag works
