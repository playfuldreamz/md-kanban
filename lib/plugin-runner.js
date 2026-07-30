/**
 * Plugin runner — loads and applies parser/writer plugins.
 *
 * Plugins are loaded from:
 *   1. Built-in (lib/builtin/) — shipped with the package
 *   2. User global (~/kanban-md/plugins/) — personal plugins
 *   3. Project local (.kanban/plugins/) — per-project overrides
 *
 * Each plugin exports:
 *   { name: string, parseCard?(card, rawLine), serializeCard?(card, line) }
 *
 * Plugins are applied in load order (builtin → global → project).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/** Load a single plugin from a .js file. Returns null if not found. */
function loadPlugin(filePath) {
  try {
    const mod = require(filePath);
    if (mod && mod.name && (mod.parseCard || mod.serializeCard)) {
      return mod;
    }
  } catch {
    // File not found or doesn't export a valid plugin — skip
  }
  return null;
}

/**
 * Load all enabled plugins.
 * @param {string[]} enabledNames — list from @plugins config
 * @param {string} [projectDir] — project root for local plugins
 * @returns {{ parse: Function[], serialize: Function[] }}
 */
function loadPlugins(enabledNames, projectDir) {
  const plugins = [];
  const builtinDir = path.join(__dirname, 'builtin');
  const globalDir = path.join(os.homedir(), 'kanban-md', 'plugins');
  const localDir = projectDir ? path.join(projectDir, '.kanban', 'plugins') : null;

  for (const name of enabledNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    // Try built-in first
    let plugin = loadPlugin(path.join(builtinDir, trimmed));
    // Then global
    if (!plugin) plugin = loadPlugin(path.join(globalDir, trimmed));
    // Then project-local
    if (!plugin && localDir) plugin = loadPlugin(path.join(localDir, trimmed));

    if (plugin) {
      plugin._source = 'plugin:' + trimmed;
      plugins.push(plugin);
    }
  }

  return {
    parse: plugins.filter((p) => typeof p.parseCard === 'function'),
    serialize: plugins.filter((p) => typeof p.serializeCard === 'function'),
  };
}

/**
 * Extract @plugins list from preamble text.
 * Looks for: @plugins name1, name2, name3
 * @param {string} preamble
 * @returns {string[]}
 */
function parsePluginConfig(preamble) {
  const match = preamble.match(/@plugins\s+([^\n]+)/);
  if (!match) return [];
  return match[1].split(',').map((s) => s.trim()).filter(Boolean);
}

module.exports = { loadPlugins, parsePluginConfig, loadPlugin };
