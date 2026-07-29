import { describe, it, expect } from 'vitest';
import { renderInline } from '../lib/markdown';

describe('renderInline', () => {
  it('renders bold', () => {
    expect(renderInline('**hello**')).toContain('<strong>hello</strong>');
  });

  it('renders italic', () => {
    expect(renderInline('*world*')).toContain('<em>world</em>');
  });

  it('renders inline code', () => {
    expect(renderInline('use `map()`')).toContain('<code');
  });

  it('renders links', () => {
    const result = renderInline('see [docs](https://example.com)');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('>docs</a>');
  });

  it('escapes raw HTML', () => {
    const result = renderInline('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('handles mixed formatting', () => {
    const result = renderInline('**bold** and *italic* with `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code');
  });

  it('handles plain text unchanged', () => {
    expect(renderInline('just plain text')).toBe('just plain text');
  });

  it('renders empty string', () => {
    expect(renderInline('')).toBe('');
  });
});
