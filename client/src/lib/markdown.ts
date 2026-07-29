/**
 * Tiny inline Markdown → HTML renderer.
 *
 * Handles a safe subset of inline formatting only — no block elements,
 * no raw HTML passthrough, no images. Used for card descriptions.
 *
 * Supported:
 *   **bold**   → <strong>bold</strong>
 *   *italic*   → <em>italic</em>
 *   `code`     → <code>code</code>
 *   [text](url)→ <a href="url">text</a>
 *
 * Everything else (headings, lists, blockquotes, raw HTML) is left as
 * plain text — descriptions are short, inline-only content.
 */

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => ENTITIES[ch] || ch);
}

export function renderInline(markdown: string): string {
  let html = escapeHtml(markdown);

  // Order matters: code first (no formatting inside), then links, then bold/italic.

  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="text-[85%] bg-background-muted rounded px-1 py-px font-mono">$1</code>');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-primary underline hover:text-primary-strong transition-colors" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* (but not ** which was already handled)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return html;
}
