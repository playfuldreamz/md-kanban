#!/usr/bin/env node

/**
 * pre-publish guard — runs automatically before `npm publish` via prepublishOnly.
 * Checks:
 *   1. Working tree is clean (no uncommitted changes)
 *   2. Current commit has a git tag matching package.json version
 *
 * Failures block the publish with a clear message. No agent has to remember.
 */

const { execSync } = require('child_process');
const path = require('path');

const PKG = require(path.resolve(__dirname, '..', 'package.json'));
const EXPECTED_TAG = `v${PKG.version}`;

let errors = [];

// ── Check 1: clean working tree ──────────────────────────────────────────
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    errors.push(
      'Working tree is NOT clean. Uncommitted changes:\n' +
        status
          .trim()
          .split('\n')
          .map((l) => '  ' + l)
          .join('\n') +
        '\n  → Commit or stash changes before publishing.'
    );
  }
} catch (e) {
  errors.push('Not a git repository (or git not found). Cannot verify release state.');
}

// ── Check 2: matching git tag ────────────────────────────────────────────
try {
  const tags = execSync('git tag --points-at HEAD', { encoding: 'utf8' }).trim();
  const currentTags = tags ? tags.split('\n').filter(Boolean) : [];
  if (!currentTags.includes(EXPECTED_TAG)) {
    errors.push(
      `No tag "${EXPECTED_TAG}" on current commit.\n` +
        (currentTags.length > 0
          ? `  Tags on HEAD: ${currentTags.join(', ')}\n`
          : '  HEAD has no tags.\n') +
        `  → Run: git tag ${EXPECTED_TAG} -m "Release ${PKG.version}"\n` +
        `  → Then: git push origin ${EXPECTED_TAG}`
    );
  } else {
    console.log(`✓ Tag ${EXPECTED_TAG} found on HEAD`);
  }
} catch (e) {
  // git error already reported above
}

// ── Report ────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n╔══════════════════════════════════════════════════╗');
  console.error('║  PRE-PUBLISH CHECK FAILED                        ║');
  console.error('╠══════════════════════════════════════════════════╣');
  errors.forEach((err) => {
    err.split('\n').forEach((line) => console.error('║  ' + line));
    console.error('║                                                  ║');
  });
  console.error('╚══════════════════════════════════════════════════╝\n');
  process.exit(1);
}

console.log('✓ Pre-publish checks passed — ready to publish.');
