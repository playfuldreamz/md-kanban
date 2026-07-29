# Changelog

## [Session] — 2026-07-29
<!-- pi-session: C:\Users\obose\.pi\agent\sessions\--C--Users-obose-Documents-GitHub-kanban-md--\2026-07-29T18-26-22-147Z_019faf20-ad01-7d56-b01f-00e3388c0bf4.jsonl -->

- feat: card creation date tracking via HTML comment
  
  Parser extracts createdAt from <!-- created:YYYY-MM-DD --> comments
  embedded in the rawLine. The comment is stripped from descriptions so
  it doesn't appear in the UI text. Writer appends the comment when
  serializing changed cards, and preserves it verbatim for unchanged
  cards (zero diff on untouched cards).
  
  Server auto-stamps today's date on all new cards via createCard().
  UI shows relative dates (\
