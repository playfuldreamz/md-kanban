# Changelog

## [Session] — 2026-07-29
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-29T18-26-22-147Z_019faf20-ad01-7d56-b01f-00e3388c0bf4.jsonl -->
- fix: HelpDialog scrolls properly on small screens
  
  Changed from centered overflow dialog to flex-col layout with fixed
  header and scrollable body. max-h-[85vh] prevents viewport overflow.
  Title stays visible while content scrolls independently.
- feat: plugin system for parser extensions + test cards
  
  Plugin runner (lib/plugin-runner.js): loads named plugins from
  builtin/global/project dirs, parses @plugins from preamble.
  
  Built-in plugins:
  - due-dates: extracts due:YYYY-MM-DD → card.dueDate, UI renders
    colored badge (red overdue, amber today/soon, blue upcoming)
  - warning-cards: recognizes - [!] syntax → card.warning, UI renders
    amber left border on card
  
  Parser updated to accept plugins option and run parseCard hooks.
  Writer runs serializeCard hooks. Server reads @plugins from preamble,
  caches loaded plugins per-file. Plugin errors are non-fatal.
  
  TODO.md: @plugins due-dates, warning-cards enabled. 3 demo cards
  added to To Do column (warning, due date, overdue).
  
  Types: Card now has dueDate? and warning? fields.

- feat: card creation date tracking via HTML comment
  
  Parser extracts createdAt from <!-- created:YYYY-MM-DD --> comments
  embedded in the rawLine. The comment is stripped from descriptions so
  it doesn't appear in the UI text. Writer appends the comment when
  serializing changed cards, and preserves it verbatim for unchanged
  cards (zero diff on untouched cards).
  
  Server auto-stamps today's date on all new cards via createCard().
  UI shows relative dates (\
