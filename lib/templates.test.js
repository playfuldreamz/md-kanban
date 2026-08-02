/**
 * Template engine test suite.
 * Run: node lib/templates.test.js
 */

const { loadTemplate, listTemplates, renderTemplate } = require('./templates');
const { parseMarkdown } = require('./parser');
const { test, assert, assertEqual, assertDeepEqual, run } = require('./test-utils');

// ─── loadTemplate ──────────────────────────────────────────────────────────

test('loadTemplate: kanban returns valid template with 3 columns', () => {
  const tmpl = loadTemplate('kanban');
  assert(tmpl !== null, 'kanban template should exist');
  assertEqual(tmpl.name, 'Kanban', 'name should be Kanban');
  assert(tmpl.columns.length === 3, 'should have 3 columns');
  assert(tmpl.columns.every(c => Array.isArray(c.cards)), 'every column should have cards array');
});

test('loadTemplate: bug-tracker returns valid template with 4 columns', () => {
  const tmpl = loadTemplate('bug-tracker');
  assert(tmpl !== null, 'bug-tracker template should exist');
  assert(tmpl.columns.length === 4, 'should have 4 columns');
  const names = tmpl.columns.map(c => c.name);
  assertEqual(names[0], 'Reported');
  assertEqual(names[1], 'Triaging');
  assertEqual(names[2], 'Fixing');
  assertEqual(names[3], 'Resolved');
});

test('loadTemplate: sprint-planning returns valid template with 5 columns', () => {
  const tmpl = loadTemplate('sprint-planning');
  assert(tmpl !== null, 'sprint-planning template should exist');
  assert(tmpl.columns.length === 5, 'should have 5 columns');
});

test('loadTemplate: reading-list returns valid template with 3 columns', () => {
  const tmpl = loadTemplate('reading-list');
  assert(tmpl !== null, 'reading-list template should exist');
  assert(tmpl.columns.length === 3, 'should have 3 columns');
});

test('loadTemplate: invalid name returns null', () => {
  assert(loadTemplate('nonexistent') === null, 'should return null for invalid template');
  assert(loadTemplate('') === null, 'should return null for empty name');
});

// ─── listTemplates ──────────────────────────────────────────────────────────

test('listTemplates: returns at least 4 templates with name and description', () => {
  const list = listTemplates();
  assert(list.length >= 4, 'should have at least 4 templates');
  for (const item of list) {
    assert(typeof item.name === 'string' && item.name.length > 0, 'each template should have a name');
    assert(typeof item.description === 'string' && item.description.length > 0, 'each template should have a description');
  }
  const names = list.map(t => t.name);
  assert(names.includes('kanban'), 'should include kanban');
  assert(names.includes('bug-tracker'), 'should include bug-tracker');
  assert(names.includes('sprint-planning'), 'should include sprint-planning');
  assert(names.includes('reading-list'), 'should include reading-list');
});

// ─── renderTemplate ─────────────────────────────────────────────────────────

test('renderTemplate: produces parseable TODO.md', () => {
  const tmpl = loadTemplate('kanban');
  const md = renderTemplate(tmpl);
  assert(typeof md === 'string' && md.length > 100, 'rendered markdown should be a non-trivial string');
  assert(md.includes('<!--'), 'should include preamble comment');
  assert(md.includes('# Project Board'), 'should include H1 title');
  assert(md.includes('## To Do'), 'should include To Do column');
  assert(md.includes('## In Progress'), 'should include In Progress column');
  assert(md.includes('## Done'), 'should include Done column');
  assert(md.includes('- [ ] **'), 'should include open cards');
  assert(md.includes('- [x] **'), 'should include done cards');

  // Should round-trip through parser
  const parsed = parseMarkdown(md);
  assert(parsed.columns.length === 3, 'parsed board should have 3 columns');
  assert(parsed.title === 'Project Board', 'parsed board should have correct title');
});

test('renderTemplate: includes sub-tasks with indentation', () => {
  const tmpl = loadTemplate('kanban');
  const md = renderTemplate(tmpl);
  assert(md.includes('  - [ ]'), 'should include indented sub-tasks');
  assert(md.includes('  - [x]'), 'should include indented done sub-tasks');
});

test('renderTemplate: renders tags in card lines', () => {
  const tmpl = loadTemplate('bug-tracker');
  const md = renderTemplate(tmpl);
  assert(md.includes('#bug'), 'should include #bug tags');
  assert(md.includes('#critical'), 'should include #critical tags');
});

// ─── All templates parse successfully ────────────────────────────────────────

test('renderTemplate: all templates parse without errors', () => {
  for (const name of ['kanban', 'bug-tracker', 'sprint-planning', 'reading-list']) {
    const tmpl = loadTemplate(name);
    const md = renderTemplate(tmpl);
    let parsed;
    try {
      parsed = parseMarkdown(md);
    } catch (err) {
      assert(false, `${name}: parseMarkdown threw: ${err.message}`);
    }
    assert(parsed.columns.length > 0, `${name}: should have at least 1 column`);
    const totalCards = parsed.columns.reduce((s, c) => s + c.cards.length, 0);
    assert(totalCards > 0, `${name}: should have at least 1 card`);
  }
});

run();
