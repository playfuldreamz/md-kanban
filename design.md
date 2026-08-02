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
- **Column card area**: `overflow-y-auto` — vertical scroll for many cards
- **Scrollbar**: Appica UI's `ScrollArea` component wraps the column list for custom scrollbars

---

## Component Specifications

### BoardShell

The root layout component. Full viewport height, flex column.

```tsx
<div className="h-screen flex flex-col bg-background">
  <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl">
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <Badge variant="neutral">{totalCards} tasks</Badge>
    </div>
    <ThemeToggle />
  </header>
  <ScrollArea className="flex-1">
    <div className="flex gap-4 p-4 h-full items-start">
      {columns.map(col => <Column key={col.id} column={col} />)}
    </div>
  </ScrollArea>
</div>
```

### Column

Each column is an Appica UI `Card` with a header, scrollable card list, and inline add form.

```tsx
<Card className="w-72 flex-shrink-0 flex flex-col max-h-full">
  {/* Header */}
  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
    {column.emoji && <span className="text-sm">{column.emoji}</span>}
    <span className="text-sm font-medium text-foreground truncate">{column.name}</span>
    <Badge variant="neutral" className="ml-auto">{column.cards.length}</Badge>
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

| Icon | Usage |
|------|-------|
| `Trash` | Delete card button |
| `Plus` | Add card button (inside Input? or column header) |
| `SunHigh` | Light mode toggle |
| `MoonStars` | Dark mode toggle |
| `WarningTriangle` | Error/warning alerts |
| `CheckCircle` | Success toast |
| `XmarkCircle` | Error toast |
| `Spinner` | Loading states |
| `Kanban` | Favicon / board icon |

No emoji in UI chrome. Emoji in column headers come from the TODO.md file, not the app.

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
- ❌ Custom scrollbar CSS — use Appica UI `ScrollArea`
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
