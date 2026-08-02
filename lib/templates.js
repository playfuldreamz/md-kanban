/**
 * Template engine for md-kanban init.
 *
 * Loads template JSON files from lib/templates/ and renders them as
 * valid TODO.md strings with the FORMAT_GUIDE preamble.
 */

const fs = require('fs');
const path = require('path');
const { FORMAT_GUIDE } = require('./server-utils');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Load a template by name (filename stem without .json).
 * @param {string} name — e.g. "kanban", "bug-tracker"
 * @returns {object|null} template object or null if not found
 */
function loadTemplate(name) {
  // Guard against directory traversal
  const safe = path.basename(name);
  const filePath = path.join(TEMPLATES_DIR, safe + '.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * List all available templates with name and description.
 * @returns {{ name: string, description: string }[]}
 */
function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
  const result = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf-8');
      const tmpl = JSON.parse(raw);
      result.push({
        name: path.basename(file, '.json'),
        description: tmpl.description || '',
      });
    } catch {
      // Skip malformed templates
    }
  }
  return result;
}

/**
 * Render a template object to a complete TODO.md string.
 * Includes the FORMAT_GUIDE preamble, H1 title, and all columns/cards.
 * @param {object} tmpl
 * @returns {string}
 */
function renderTemplate(tmpl) {
  const lines = [];

  // Preamble (format guide + plugins)
  lines.push(FORMAT_GUIDE);
  lines.push('');

  // Title
  lines.push('# ' + (tmpl.title || tmpl.name || 'TODO'));
  lines.push('');

  // Columns and cards
  for (const col of (tmpl.columns || [])) {
    lines.push('## ' + col.name);
    lines.push('');

    for (const card of (col.cards || [])) {
      lines.push(renderCard(card, 0));
    }

    lines.push('');
  }

  // Trim trailing blank lines but keep one
  while (lines.length > 1 && lines[lines.length - 1] === '' && lines[lines.length - 2] === '') {
    lines.pop();
  }

  return lines.join('\n') + '\n';
}

/**
 * Render a single card and its children recursively.
 * @param {object} card
 * @param {number} depth — indentation level (0 = root card)
 * @returns {string}
 */
function renderCard(card, depth) {
  const indent = '  '.repeat(depth);
  const done = card.done ? 'x' : ' ';
  const title = '**' + card.title + '**';
  const desc = card.description ? ' — ' + card.description : '';
  let line = indent + '- [' + done + '] ' + title + desc;

  // Append tags as #hashtags in description if provided
  if (card.tags && card.tags.length > 0) {
    const tagStr = card.tags.map(t => t.startsWith('#') ? t : '#' + t).join(' ');
    if (!card.description) {
      line += ' — ' + tagStr;
    } else {
      // Append tags to existing description if not already present
      for (const tag of card.tags) {
        const tagClean = tag.startsWith('#') ? tag : '#' + tag;
        if (!line.includes(tagClean)) {
          line += ' ' + tagClean;
        }
      }
    }
  }

  // Collect children
  const children = [];
  if (card.children && card.children.length > 0) {
    for (const child of card.children) {
      children.push(renderCard(child, depth + 1));
    }
  }

  return [line, ...children].join('\n');
}

module.exports = { loadTemplate, listTemplates, renderTemplate };
