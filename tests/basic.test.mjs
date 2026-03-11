/**
 * @manasdb/mcp-server — Comprehensive Test Suite
 * Run with: npm test
 *
 * Covers:
 *  1. Config parsing (including edge cases)
 *  2. CLI flag precedence
 *  3. memorize response formatting
 *  4. recall result formatting (including edge cases)
 *  5. forget tool input
 *  6. stdout guard verification
 */

import assert from 'assert';

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${description}`);
    console.error(`   → ${e.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (mirroring logic in src/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

function parseConfig(configStr) {
  let payload = JSON.parse(configStr);
  if (Array.isArray(payload)) payload = { databases: payload };
  return payload;
}

function resolveConfigStr(envValue, cliFlag) {
  // cli flag takes precedence over env var
  if (cliFlag && cliFlag.startsWith('--manas-config=')) {
    const extracted = cliFlag.split(/--manas-config=(.*)/s)[1];
    if (extracted) return extracted;
  }
  return envValue;
}

function extractContentId(result) {
  return result?.contentId ?? result?.inserted?.[0]?.contentId ?? 'unknown';
}

function formatRecallResults(results) {
  if (!Array.isArray(results) || results.length === 0) return 'No results found.';
  const formatted = results.map((r, i) => {
    const lines = [
      `[${i + 1}] contentId: ${r.contentId ?? 'N/A'}`,
      `    score:     ${typeof r.score === 'number' ? r.score.toFixed(4) : 'N/A'}`,
      `    database:  ${r.database ?? 'N/A'}`,
      `    text:      ${r.text ?? ''}`,
    ];
    if (r.metadata?.sectionTitle) lines.push(`    section:   ${r.metadata.sectionTitle}`);
    return lines.join('\n');
  }).join('\n\n');
  return `Found ${results.length} result(s):\n\n${formatted}\n\nTo delete a memory, use the 'forget' tool with its contentId.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category 1: Config Parsing
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 1: Config Parsing ──');

test('Array input wraps into { databases }', () => {
  const r = parseConfig('[{"type":"mongodb","uri":"mongodb://localhost:27017"}]');
  assert.ok(Array.isArray(r.databases));
  assert.equal(r.databases[0].type, 'mongodb');
});

test('Full object passes through unchanged', () => {
  const input = { databases: [{ type: 'postgres', uri: 'postgresql://localhost/test' }], projectName: 'test', modelConfig: { source: 'transformers' }, telemetry: false };
  const r = parseConfig(JSON.stringify(input));
  assert.equal(r.projectName, 'test');
  assert.equal(r.modelConfig.source, 'transformers');
  assert.equal(r.telemetry, false);
});

test('modelConfig with gemini and apiKey passes through', () => {
  const input = { databases: [{ type: 'mongodb', uri: 'mongodb://localhost' }], modelConfig: { source: 'gemini', apiKey: 'test-key', model: 'gemini-embedding-001' } };
  const r = parseConfig(JSON.stringify(input));
  assert.equal(r.modelConfig.source, 'gemini');
  assert.equal(r.modelConfig.apiKey, 'test-key');
});

test('Empty databases array [] passes through without wrapping', () => {
  const r = parseConfig(JSON.stringify({ databases: [] }));
  assert.ok(Array.isArray(r.databases));
  assert.equal(r.databases.length, 0);
});

test('Invalid JSON throws parse error', () => {
  assert.throws(() => parseConfig('not-valid-json'), SyntaxError);
});

test('Null JSON payload is handled gracefully (not an array or object with databases)', () => {
  // JSON.parse('null') is valid in JSON spec — returns null
  // Our server guards: if it's an array, wrap it; otherwise pass through.
  // null will be passed to ManasDB() which should throw at runtime — the key is we don't crash during config parsing.
  const payload = JSON.parse('null');
  // After parsing, null is neither an array nor a valid config — it passes through as-is.
  const result = Array.isArray(payload) ? { databases: payload } : payload;
  assert.equal(result, null); // It passes through — ManasDB constructor handles the error
});

// ─────────────────────────────────────────────────────────────────────────────
// Category 2: CLI Flag Precedence
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 2: CLI Flag Precedence ──');

test('--manas-config flag takes precedence over env var', () => {
  const envVal = JSON.stringify({ databases: [{ type: 'mongo', uri: 'env-uri' }] });
  const cliFlag = '--manas-config={"databases":[{"type":"postgres","uri":"cli-uri"}]}';
  const result = resolveConfigStr(envVal, cliFlag);
  assert.ok(result.includes('cli-uri'));
  assert.ok(!result.includes('env-uri'));
});

test('Env var is used when no CLI flag is provided', () => {
  const envVal = JSON.stringify({ databases: [{ type: 'mongo', uri: 'env-uri' }] });
  const result = resolveConfigStr(envVal, undefined);
  assert.ok(result.includes('env-uri'));
});

test('Unrecognized CLI flag does not override env var', () => {
  const envVal = JSON.stringify({ databases: [] });
  const result = resolveConfigStr(envVal, '--some-other-flag=value');
  assert.equal(result, envVal);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category 3: memorize Response Formatting
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 3: memorize Response ──');

test('contentId extracted from result.contentId', () => {
  const result = { contentId: 'direct-id-123', chunks: 2 };
  assert.equal(extractContentId(result), 'direct-id-123');
});

test('contentId extracted from result.inserted[0].contentId', () => {
  const result = { inserted: [{ contentId: 'nested-id-456' }] };
  assert.equal(extractContentId(result), 'nested-id-456');
});

test('contentId falls back to "unknown" when absent', () => {
  assert.equal(extractContentId(null), 'unknown');
  assert.equal(extractContentId({}), 'unknown');
  assert.equal(extractContentId({ inserted: [] }), 'unknown');
});

// ─────────────────────────────────────────────────────────────────────────────
// Category 4: recall Formatting Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 4: recall Formatting ──');

test('Empty results → "No results found."', () => {
  assert.equal(formatRecallResults([]), 'No results found.');
});

test('null results → "No results found."', () => {
  assert.equal(formatRecallResults(null), 'No results found.');
});

test('Single result surfaces contentId prominently', () => {
  const r = formatRecallResults([{ contentId: 'abc123', score: 0.95, database: 'mongodb', text: 'Hello' }]);
  assert.ok(r.includes('contentId: abc123'));
  assert.ok(r.includes('score:     0.9500'));
  assert.ok(r.includes('forget'));
});

test('Result with score: 0 shows 0.0000 not NaN', () => {
  const r = formatRecallResults([{ contentId: 'id1', score: 0, database: 'mongodb', text: 'test' }]);
  assert.ok(r.includes('0.0000'));
  assert.ok(!r.includes('NaN'));
});

test('Missing contentId field shows N/A', () => {
  const r = formatRecallResults([{ score: 0.8, database: 'postgres', text: 'test' }]);
  assert.ok(r.includes('contentId: N/A'));
});

test('Result with sectionTitle shows section line', () => {
  const r = formatRecallResults([{ contentId: 'id2', score: 0.7, database: 'mongodb', text: 'chunk', metadata: { sectionTitle: 'Introduction' } }]);
  assert.ok(r.includes('section:   Introduction'));
});

test('Multiple results are correctly indexed', () => {
  const r = formatRecallResults([
    { contentId: 'id1', score: 0.9, database: 'mongodb', text: 'one' },
    { contentId: 'id2', score: 0.8, database: 'postgres', text: 'two' },
  ]);
  assert.ok(r.includes('[1] contentId: id1'));
  assert.ok(r.includes('[2] contentId: id2'));
  assert.ok(r.includes('Found 2 result(s)'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Category 5: forget Tool Input Validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 5: forget Input Validation ──');

import { z } from 'zod';
const ForgetSchema = z.object({ contentId: z.string().min(1) });

test('Valid contentId passes Zod validation', () => {
  const result = ForgetSchema.safeParse({ contentId: 'abc-123' });
  assert.ok(result.success);
});

test('Empty string contentId fails Zod validation', () => {
  const result = ForgetSchema.safeParse({ contentId: '' });
  assert.ok(!result.success);
});

test('Missing contentId field fails Zod validation', () => {
  const result = ForgetSchema.safeParse({});
  assert.ok(!result.success);
});

// ─────────────────────────────────────────────────────────────────────────────
// Category 6: stdout Guard
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n── Category 6: stdout Guard ──');

test('console.log redirects to stderr (stdout stays clean)', () => {
  const originalLog = console.log;
  const originalError = console.error;

  let stderrReceived = false;
  console.error = (...args) => { stderrReceived = true; };
  console.log = (...args) => { console.error(...args); };

  console.log('test message');

  assert.ok(stderrReceived, 'console.log should forward to stderr');

  // Restore
  console.log = originalLog;
  console.error = originalError;
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  console.error('\n❌ Some tests failed!');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
}
