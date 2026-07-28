/**
 * Minimal test runner shared by parser and writer test suites.
 */

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Mismatch'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg || 'Deep mismatch'}:\n  expected: ${e}\n  got:      ${a}`);
  }
}

async function run() {
  console.log(`\nRunning ${tests.length} tests...\n`);
  for (const { name, fn } of tests) {
    try {
      const result = fn();
      // Support both sync and async tests
      if (result instanceof Promise) await result;
      passed++;
      console.log(`  ✅ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ ${name}`);
      console.log(`     ${err.message}`);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed, ${tests.length} total\n`);
  return failed === 0;
}

module.exports = { test, assert, assertEqual, assertDeepEqual, run };
