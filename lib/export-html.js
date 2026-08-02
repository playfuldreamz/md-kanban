/**
 * Static HTML export renderer.
 *
 * Produces a self-contained HTML page from BoardState — no JavaScript,
 * no external CSS, all styles inline. Light theme only.
 *
 * @param {import('./parser').BoardState} board
 * @returns {string} complete HTML document
 */

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDueColor(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return '#999';
  const diff = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return '#ef4444';
  if (diff === 0) return '#f59e0b';
  if (diff <= 3) return '#f59e0b';
  return '#3b82f6';
}

function formatDueDate(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return dueDate;
  const diff = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return 'Overdue ' + Math.abs(diff) + 'd';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return 'Due ' + months[due.getMonth()] + ' ' + due.getDate();
}

var TAG_COLORS = ['#0ea5e9','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#f43f5e'];
function tagColor(tag) {
  var h = 0;
  for (var i = 0; i < tag.length; i++) h = ((h << 5) - h + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length];
}

var ASSIGNEE_COLORS = ['#ec4899','#3b82f6','#14b8a6','#f97316','#6366f1','#84cc16','#f43f5e','#06b6d4'];
function assigneeColor(name) {
  var h = 0;
  for (var i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return ASSIGNEE_COLORS[Math.abs(h) % ASSIGNEE_COLORS.length];
}

function initials(name) {
  var parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function extractTags(text) {
  var matches = text.match(/#([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  var seen = {};
  var result = [];
  for (var i = 0; i < matches.length; i++) {
    var t = matches[i].slice(1).toLowerCase();
    if (!seen[t]) { seen[t] = true; result.push(t); }
  }
  return result;
}

function extractAssignees(text) {
  var matches = text.match(/@([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  var seen = {};
  var result = [];
  for (var i = 0; i < matches.length; i++) {
    var u = matches[i].slice(1).toLowerCase();
    if (!seen[u]) { seen[u] = true; result.push(u); }
  }
  return result;
}

function renderCard(card, depth) {
  var pad = depth * 16;
  var html = '<div style="margin-left:' + pad + 'px;padding:8px 10px;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:6px;' + (card.warning ? 'border-left:3px solid #f59e0b;' : '') + (card.done ? 'background:#f0fdf4;opacity:0.75;' : '') + '">';

  var check = card.done ? '\u2611' : '\u2610';
  var titleStyle = card.done ? 'text-decoration:line-through;color:#999;' : '';
  html += '<div style="display:flex;align-items:flex-start;gap:6px;">';
  html += '<span style="font-size:14px;flex-shrink:0;">' + check + '</span>';
  html += '<span style="font-size:13px;font-weight:600;' + titleStyle + '">' + esc(card.title) + '</span>';
  html += '</div>';

  if (card.description) {
    html += '<div style="font-size:11px;color:#888;margin-top:3px;">' + esc(card.description) + '</div>';
  }

  var badges = [];
  if (card.dueDate) {
    badges.push('<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;color:#fff;background:' + getDueColor(card.dueDate) + ';">' + esc(formatDueDate(card.dueDate)) + '</span>');
  }
  var assigneeNames = card.assignees || extractAssignees(card.description || '');
  for (var ai = 0; ai < assigneeNames.length; ai++) {
    var u = assigneeNames[ai];
    var ac = assigneeColor(u);
    badges.push('<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font-size:8px;color:#fff;background:' + ac + ';" title="' + esc(u) + '">' + esc(initials(u)) + '</span>');
  }
  var tags = extractTags(card.description || '');
  for (var ti = 0; ti < tags.length; ti++) {
    var tag = tags[ti];
    var tc = tagColor(tag);
    badges.push('<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;color:#fff;background:' + tc + ';">' + esc(tag) + '</span>');
  }

  if (badges.length > 0) {
    html += '<div style="display:flex;align-items:center;gap:4px;margin-top:6px;flex-wrap:wrap;">' + badges.join('') + '</div>';
  }

  if (card.createdAt) {
    html += '<div style="font-size:9px;color:#aaa;margin-top:4px;">Created ' + esc(card.createdAt) + '</div>';
  }

  html += '</div>';

  if (card.children) {
    for (var ci = 0; ci < card.children.length; ci++) {
      html += renderCard(card.children[ci], depth + 1);
    }
  }

  return html;
}

function renderExportHtml(board) {
  var now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  var totalCards = board.columns.reduce(function(s, c) { return s + c.cards.length; }, 0);

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + esc(board.title || 'Kanban Board') + ' \u2014 Export</title>\n<style>\n  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n  body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #fafafa; color: #111; padding: 20px; }\n  h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }\n  .board { display: flex; gap: 16px; overflow-x: auto; align-items: flex-start; padding: 4px 0; }\n  .column { min-width: 280px; max-width: 320px; flex-shrink: 0; border: 1px solid #e5e5e5; border-radius: 10px; background: #fff; }\n  .col-header { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }\n  .col-badge { margin-left: auto; font-size: 11px; color: #999; background: #f3f3f3; padding: 1px 8px; border-radius: 10px; }\n  .col-body { padding: 8px; max-height: 70vh; overflow-y: auto; }\n  .col-empty { padding: 30px 8px; text-align: center; font-size: 11px; color: #ccc; border: 2px dashed #eee; border-radius: 8px; margin: 4px; }\n  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #aaa; }\n</style>\n</head>\n<body>\n<h1>' + esc(board.title || 'Kanban Board') + ' <span style="font-size:12px;color:#999;font-weight:400;">' + totalCards + ' task' + (totalCards !== 1 ? 's' : '') + '</span></h1>\n<div class="board">\n';

  for (var ci = 0; ci < board.columns.length; ci++) {
    var col = board.columns[ci];
    var emoji = col.emoji || '';
    html += '<div class="column">';
    html += '<div class="col-header">' + esc(emoji) + ' ' + esc(col.name) + ' <span class="col-badge">' + col.cards.length + '</span></div>';
    html += '<div class="col-body">';
    if (col.cards.length === 0) {
      html += '<div class="col-empty">No tasks</div>';
    } else {
      for (var i = 0; i < col.cards.length; i++) {
        html += renderCard(col.cards[i], 0);
      }
    }
    html += '</div></div>';
  }

  html += '</div>\n<div class="footer">Exported at ' + esc(now) + ' &mdash; <em>kanban-md static snapshot</em></div>\n</body>\n</html>';

  return html;
}

module.exports = { renderExportHtml };
