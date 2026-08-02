# md-kanban — Design System

> Built on [Appica UI](https://appica.dev/ui/docs/react/installation). All components, tokens, and
> patterns reference the Appica design system. See [llms.txt](https://appica.dev/llms.txt) and
> [llms-full.txt](https://appica.dev/llms-full.txt) for the complete Appica UI reference.
>
> **CRITICAL: Before adding ANY new component, ALWAYS consult these references:**
> - [Components](https://appica.dev/ui/components) — verify component exists and check API
> - [Icons](https://appica.dev/ui/icons) — search for the correct icon name in `@appica/icons-react`
> - [llms-full.txt](https://appica.dev/llms-full.txt) — full component API reference
>
> Never guess an icon name or component prop. Always look it up first.

---

## Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Components | Appica UI React | Accessible primitives (Checkbox, Button, Input, Card, Badge, Dialog, Toast) |
| Styling | Tailwind CSS v4 | Appica UI's native styling layer; all tokens are Tailwind utilities |
| Icons | `@appica/icons-react` | Ships with Appica UI; 5,000+ icons, no second library |
| Font | System font stack | Appica UI default — zero download, instant render, no layout shift |
| Animation | Appica UI built-in + Tailwind `motion-safe:` | `data-open`/`data-closed` transitions, reduced-motion aware |

---

## Colors

Appica UI uses **role-based tokens**, not hue names. Every color is a CSS variable
(`--foreground`, `--primary`, etc.) with a Tailwind utility (`text-foreground`,
`bg-primary`). The palette ships with light and dark themes — we use the defaults.

### Token usage in md-kanban

| Token | Where | Why |
|-------|-------|-----|
| `background` | Page background | Appica UI sets this; we don't override |
| `foreground` | Card titles, column headers | Default body text |
| `foreground-muted` | Card descriptions, completed card titles | Secondary information |
| `foreground-subtle` | Placeholder text in "Add task" input | Low-emphasis |
| `border` | Column card borders, separators | Default divider |
| `border-muted` | Drop zone indicator (dashed outline) | Faint hint during drag |
| `primary` | Checkbox checked state, "Add" button | Brand accent |
| `primary-foreground` | Text on primary buttons | Legible on `primary` fill |
| `success-subtle` | Done card background tint | Positive affordance, low-key |
| `success-foreground` | Done card muted text | Readable on `success-subtle` |
| `warning-subtle` | File-deleted warning banner | Attention, not error |
| `error-subtle` | Error toast background | Error state |
| `ring` | Focus rings on inputs and buttons | Appica UI applies this automatically |

### Dark mode

Appica UI's `ThemeProvider` handles dark mode via the `dark` class on `<html>`.
We ship a `ThemeToggle` button (Appica UI `useTheme` hook + SunHigh/MoonStars icons).
No custom dark mode overrides — the default Appica palette is sufficient.

---

## Typography

Appica UI's default system font stack applies site-wide. We use the standard
Tailwind text size utilities:

| Usage | Class | Weight |
|-------|-------|--------|
| Board title (H1) | `text-lg font-semibold` | 600 |
| Column header | `text-sm font-medium` | 500 |
| Card title | `text-sm` | 400 (normal) |
| Card title (done) | `text-sm line-through text-foreground-muted` | 400 |
| Card description | `text-xs text-foreground-muted` | 400 |
| Card count badge | `text-2xs` (Appica Badge default) | 500 |
| "Add task" placeholder | `text-sm text-foreground-subtle` | 400 |

No custom font sizes. Everything uses Appica UI's typographic scale.

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  BoardShell                                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Header bar (glass/backdrop)                      │   │
│  │  ┌─────────────────────┐  ┌──────────────────┐   │   │
│  │  │ Board title          │  │ ThemeToggle      │   │   │
│  │  │ + column count badge │  │                  │   │   │
│  │  └─────────────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ColumnList (flex, overflow-x-auto, h-full)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🔴 Crit  │ │ 🟡 Impt  │ │ 🟢 Polish│ │ + Add    │   │
│  │      3   │ │      4   │ │      2   │ │  Column  │   │
│  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │          │   │
│  │ │ Card │ │ │ │ Card │ │ │ │ Card │ │ │          │   │
│  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │          │   │
│  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │          │   │
│  │ │ Card │ │ │ │ Card │ │ │ │ Card │ │ │          │   │
│  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │          │   │
│  │ ┌──────┐ │ │          │ │          │ │          │   │
│  │ │ +Add │ │ │          │ │          │ │          │   │
│  │ └──────┘ │ │          │ │          │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Dimensions

| Element | Width | Notes |
|---------|-------|-------|
| Column | `w-72` (288px) | Fixed width, flex-shrink-0 |
| Card | 100% of column | Padded internally |
| Column gap | `gap-4` (16px) | Between columns |
| Header bar | Full width, `h-12` (48px) | Appica UI glass pattern |
| Page container | `h-screen w-screen overflow-hidden` | Single viewport, no scroll on body |

### Scroll behavior

- **Body**: `overflow-hidden` — the board fills the viewport
- **ColumnList**: `overflow-x-auto` — horizontal scroll for many columns
- **Column card area**: `overflow-y-auto` with class `kanban-scroll-area` — vertical scroll with auto-hiding thumb (appears on hover)
- **Scrollbar**: Styled via CSS pseudo-elements (`::-webkit-scrollbar` for Webkit, `scrollbar-width` for Firefox). Uses Appica design tokens: thin 6px track, `bg-background-strong` rounded thumb, transparent track

---

## Component Specifications

### BoardShell

The root layout component. Full viewport height, flex column. Horizontal scrolling of columns
is handled by `ScrollArea` inside `ColumnList`.

```tsx
<div className="h-screen flex flex-col bg-background">
  <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl">
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <Badge variant="neutral">{totalCards} tasks</Badge>
    </div>
    <ThemeToggle />
  </header>
  <div className="flex-1 flex overflow-hidden">
    <ColumnList columns={columns} ... />
  </div>
</div>
```

### Scrollbar styling

> **Why CSS, not Appica UI ScrollArea?**  
> We initially tried Appica UI's `ScrollArea` component (as the original design spec
> suggested). It failed because `ScrollArea` wraps content in extra DOM layers
> (`Root → Viewport → Content → your div`). The `Content` element is auto-sized,
> which breaks CSS `height: 100%` resolution on child elements — percentage heights
> need an explicit-height parent, but `Content` is `height: auto`. This caused the
> entire board to scroll vertically instead of individual columns scrolling internally.
> Attempts to work around this (ref threading, `calc()` heights, ResizeObserver hacks)
> all introduced more problems than they solved.
>
> **Resolution**: Use CSS pseudo-elements (`::-webkit-scrollbar`, `scrollbar-width`).
> This achieves the identical visual result (thin rounded thumbs, theme-aware colors,
> auto-hide behavior) without touching the component tree at all. Zero layout risk.

Custom scrollbars are styled via CSS pseudo-elements targeting the browser's native
scrollbar. No wrapper components, no DOM changes, no height-chain breakage.

**Webkit** (Chrome, Edge, Safari):
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--background-strong); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: var(--foreground-muted); }
```

**Firefox**:
```css
* { scrollbar-width: thin; scrollbar-color: var(--background-strong) transparent; }
```

**Auto-hide variant** (`.kanban-scroll-area`): The vertical scrollbar inside columns
uses transparent thumb by default, revealing the themed thumb on hover with a
150ms transition.

| Location | Selector | Behavior |
|----------|----------|----------|
| ColumnList (horizontal) | `::-webkit-scrollbar` (global) | Always-visible thin scrollbar |
| Column cards (vertical) | `.kanban-scroll-area::-webkit-scrollbar-thumb` | Auto-hide: transparent → visible on hover |

```tsx
// Horizontal scroll (ColumnList) — native overflow, global scrollbar styles
<div className="flex-1 overflow-x-auto overflow-y-hidden">
  <div className="flex gap-6 p-6 h-full items-start">{columns}</div>
</div>

// Vertical scroll with auto-hide thumb (Column cards)
<div ref={cardsAreaRef} className="flex-1 overflow-y-auto kanban-scroll-area">
  <VirtualCardList ... />
</div>
```

### Column

Each column is an Appica UI `Card` with a header, scrollable card list, and inline add form.

```tsx
<Card className="w-72 flex-shrink-0 flex flex-col max-h-full">
  {/* Header — Appica icon via columnIcon(), emoji stripped via displayName() */}
  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
    {icon}
    <span className="text-sm font-medium text-foreground truncate">
      {displayName(column)}
    </span>
    <Badge variant="secondary" className="flex-shrink-0">{visibleCards.length}</Badge>
  </div>

  {/* Card list + drop zone */}
  <div
    className="flex-1 overflow-y-auto p-2 space-y-1.5"
    onDragOver={handleDragOver}
    onDrop={handleDrop}
  >
    {column.cards.map((card, i) => (
      <KanbanCard key={card.id} card={card} index={i} />
    ))}
    {/* Drop indicator for empty column */}
    {column.cards.length === 0 && (
      <div className="h-20 flex items-center justify-center border-2 border-dashed border-border-muted rounded-lg">
        <p className="text-xs text-foreground-subtle">Drop tasks here</p>
      </div>
    )}
  </div>

  {/* Add card form */}
  <AddCardForm columnId={column.id} />
</Card>
```

### KanbanCard

A compact card with checkbox, title, description, and a hover-revealed delete button.

```tsx
<Card
  draggable
  onDragStart={handleDragStart}
  className={cn(
    'cursor-grab active:cursor-grabbing transition-shadow duration-150',
    'hover:shadow-md',
    card.done && 'bg-success-subtle border-success-subtle'
  )}
>
  <div className="flex items-start gap-2">
    <Checkbox
      checked={card.done}
      onCheckedChange={() => onToggle(card.id)}
      className="mt-0.5"
    />
    <div className="flex-1 min-w-0">
      <p
        className={cn(
          'text-sm break-words',
          card.done && 'line-through text-foreground-muted'
        )}
      >
        {card.title}
      </p>
      {card.description && (
        <p className="text-xs text-foreground-muted mt-0.5 line-clamp-3">
          {card.description}
        </p>
      )}
    </div>
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete task"
      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1"
      onClick={() => onDelete(card.id)}
    >
      <Trash className="w-3.5 h-3.5" />
    </Button>
  </div>
</Card>
```

**Hover behavior**: The delete button and drag handle indicator appear on card hover. The card shadow lifts slightly (`hover:shadow-md`). Transition: 150ms ease-out.

**Done state**: Background tinted with `success-subtle`, title struck through, text muted. The checkbox remains interactive (can un-complete).

**Drag state**: `opacity-50` on the original while dragging. A semi-transparent clone follows the cursor (browser default). Drop zone highlights with `border-primary` dashed outline.

### AddCardForm

Inline at the bottom of each column. Simple input with Enter-to-submit.

```tsx
<div className="px-2 pb-2 pt-1">
  <Input
    placeholder="Add task..."
    size="sm"
    value={title}
    onChange={e => setTitle(e.target.value)}
    onKeyDown={e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
      if (e.key === 'Escape') {
        setTitle('')
        e.currentTarget.blur()
      }
    }}
  />
</div>
```

### ThemeToggle

Appica UI's standard pattern from the Dark Mode docs.

```tsx
'use client'
import { useTheme } from '@appica/ui-react/hooks/use-theme'
import { Button } from '@appica/ui-react/button'
import { SunHigh, MoonStars } from '@appica/icons-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme()
  if (!mounted) return <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" />
  const next = resolvedTheme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" onClick={() => setTheme(next)}>
      {resolvedTheme === 'dark' ? <MoonStars className="w-4 h-4" /> : <SunHigh className="w-4 h-4" />}
    </Button>
  )
}
```

---

## Animation

Appica UI handles enter/exit animations through `data-open`/`data-closed` attributes
and `motion-safe:` variants. No custom animation library.

| Element | Animation | Implementation |
|---------|-----------|----------------|
| Card mount | Fade in + slide up | `motion-safe:animate-fade-in` (Tailwind) |
| Card delete | Fade out + shrink | `data-closed:opacity-0 data-closed:scale-95` |
| Drop zone highlight | Border color transition | `transition-colors duration-150` |
| Toast mount | Slide in from right | Appica UI Toast built-in |
| Dialog open | Scale in + fade | Appica UI Dialog built-in |
| Checkbox toggle | Native transition | Appica UI Checkbox built-in |
| Theme switch | Instant (no transition) | Appica UI ThemeProvider handles this |

All animations are gated behind `motion-safe:` or use Appica UI's built-in
`motion-reduce:transition-none` pattern. See [Appica UI Animation docs](https://appica.dev/ui/docs/react/animation).

---

## States

### Loading
First visit shows Appica UI `Skeleton` cards — three columns with three skeleton
cards each. The skeleton uses `animate-pulse` with `bg-background-muted` bars.
Once the WebSocket delivers the first `sync` event, skeletons dissolve into real cards.

### Empty (no TODO.md found)
A centered Appica UI `Alert` with:
- "No TODO.md found in this directory."
- A "Create one" button that writes a starter TODO.md via the API
- The starter file has one column "📋 Tasks" with one example card

### Empty (no sections)
All cards are collected under a single "📋 Tasks" column. A subtle banner suggests
"Add ## sections to organize tasks into columns."

### Error (WebSocket disconnected)
A fixed Appica UI `Toast` at the bottom-right: "Connection lost — retrying..."
With a `Spinner` icon. Auto-dismisses on reconnect.

### File deleted
A full-screen Appica UI `Alert` with `WarningTriangle` icon:
"TODO.md was deleted. Save to recreate it." With a "Recreate" button.

---

## Icons

From `@appica/icons-react`, used at `w-3.5 h-3.5` (card actions) or `w-4 h-4` (header, theme toggle):

### UI chrome

| Icon | Usage |
|------|-------|
| `Trash` | Delete card/column button |
| `Plus` | Add card button |
| `SunHigh` | Light mode toggle |
| `MoonStars` | Dark mode toggle |
| `WarningTriangle` | Error/warning alerts |
| `CircleCheck` | Success toast / done columns |
| `XmarkCircle` | Error toast |
| `Spinner` | Loading states |
| `LayoutKanban` | Favicon / board icon / fallback column icon |

### Column icons (`columnIcon()` mapping)

Column headers display Appica icons based on column name/ID keywords. Emoji from the TODO.md file is stripped via `displayName()` and replaced with the appropriate icon at render time.

| Column pattern | Icon | Color |
|----------------|------|-------|
| `to do`, `todo` | `ClipboardCheck` | — |
| `in progress`, `progress`, `doing`, `active` | `Clock` | — |
| `done`, `complete`, `finished` | `CircleCheck` | green |
| `reported`, `submitted` | `Bug` | red |
| `triaging`, `triage` | `Search` | amber |
| `fixing`, `fix` | `Wrench` | blue |
| `resolved` | `CircleCheck` | green |
| `backlog` | `Bookmark` | — |
| `sprint` | `Rocket` | — |
| `review`, `testing`, `qa` | `Eye` | blue |
| `to read`, `want to read` | `Book2` | — |
| `reading` | `BookFilled` | — |
| `critical`, `urgent`, `blocker` | `AlertTriangle` | red |
| `important`, `high`, `priority` | `AlertTriangle` | amber |
| `polish`, `nice`, `low`, `later` | `Sparkles` | emerald |

---

## Accessibility

Appica UI handles the heavy lifting (see [Accessibility docs](https://appica.dev/ui/docs/react/accessibility)):
- Focus rings on all interactive elements
- Keyboard navigation for Checkbox, Button, Input
- ARIA wiring for Dialog, Toast
- Reduced motion support

Our additional responsibilities:
- [ ] Cards are `draggable` with `aria-grabbed` reflecting drag state
- [ ] Columns have `role="region"` and `aria-label` set to column name
- [ ] Delete buttons have `aria-label="Delete TASK_TITLE"`
- [ ] "Add task" input has `aria-label="Add task to COLUMN_NAME"`
- [ ] Color contrast: checked (done) cards must maintain 4.5:1 on `success-subtle` bg
- [ ] Keyboard: `n` focuses the first "Add task" input (Accessibility shortcut)
- [ ] Keyboard: cards are focusable in tab order (add `tabIndex={0}` on card wrapper)

---

## What NOT to do

- ❌ Custom CSS classes — Appica UI components + Tailwind utilities cover everything
- ❌ Emoji as UI icons — column emoji from the file is fine, but don't use emoji in buttons/labels
- ❌ Fixed pixel widths besides `w-72` for columns — everything else is relative or token-based
- ❌ Custom scrollbar component libraries — use CSS pseudo-elements for scrollbar styling
- ❌ Animation without `motion-safe:` — every transition must respect reduced motion
- ❌ Hardcoded color values — always use Appica UI tokens (`text-foreground`, not `text-gray-900`)
- ❌ `@appica/ui-react` direct import — use subpath imports for tree-shaking (`@appica/ui-react/button`)
- ❌ Native `title` attribute for tooltips — use the custom `Tooltip` component from `components/Tooltip.tsx`

## Plugin system

Plugins hook into the parser/writer pipeline via `parseCard()` and `serializeCard()` callbacks. Configure in the preamble with `@plugins name1, name2`. Built-in plugins live in `lib/builtin/`; user plugins in `~/md-kanban/plugins/` or `.kanban/plugins/`.

```js
// lib/builtin/my-plugin.js
module.exports = {
  name: 'my-plugin',
  parseCard(card, rawLine) { /* modify card, add fields */ return card; },
  serializeCard(card, line) { /* modify output line */ return line; },
};
```

Plugin errors are non-fatal — the parser continues if a plugin throws. Cards expose plugin-added fields (`dueDate`, `warning`) in the TypeScript `Card` interface for UI rendering.

## Board templates

`md-kanban init` scaffolds a TODO.md from preset templates. Templates are JSON files in `lib/templates/` with a schema of `{ name, title, description, columns: [{ name, cards: [{ title, description, tags, children, done }] }] }`. Column names are plain text — no emojis. The `columnIcon()` mapping in `Column.tsx` assigns the correct Appica icon at render time.

### Available templates

| Template | Columns | Use case |
|----------|---------|----------|
| `kanban` (default) | To Do, In Progress, Done | General project management |
| `bug-tracker` | Reported, Triaging, Fixing, Resolved | Software bug tracking |
| `sprint-planning` | Backlog, This Sprint, In Progress, Review, Done | Agile sprint management |
| `reading-list` | To Read, Reading, Finished | Book/article tracking |

### CLI

```bash
md-kanban init                          # Kanban template (default)
md-kanban init --template bug-tracker   # Specific template
md-kanban init --list                   # List all available templates
md-kanban init --force                  # Overwrite existing TODO.md
```

When adding a new template column name, add the corresponding icon mapping to `columnIcon()` in `Column.tsx` so the column header renders the correct Appica icon.

## Tooltip pattern

Use the custom `Tooltip` component for all hover tooltips — never the native `title` attribute. It uses a portal-based overlay matching the priority indicator tooltip style:

```tsx
import Tooltip from './Tooltip';

<Tooltip label="Undo (Ctrl+Z)">
  <button onClick={doUndo} disabled={!canUndo}>
    <ArrowBackUp className="w-3.5 h-3.5" />
  </button>
</Tooltip>
```

The tooltip renders as a `bg-background-inverse text-foreground-inverse` badge centered above the element. It appears on hover and hides on leave. Keep labels short — 1-3 words. Include keyboard shortcuts in parentheses: `"Search (⌘K)"`, `"Undo (Ctrl+Z)"`.
