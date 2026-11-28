// SPDX-License-Identifier: MIT
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, ozRoot } = require('../lib/runtime.cjs');

function verify(overrideRoot) {
  const env = { ...process.env };
  if (overrideRoot) env.EVE_OPENZEPPELIN_ROOT = overrideRoot;
  const result = spawnSync(process.execPath, ['test/verify-receipt.cjs'], {
    cwd: root, env, encoding: 'utf8',
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

test('receipt verification rehashes the selected OpenZeppelin import root', t => {
  const original = verify();
  assert.equal(original.status, 0, original.output);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'halveth-oz-receipt-'));
  t.after(() => {
    const resolved = path.resolve(temp);
    assert(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert(path.basename(resolved).startsWith('halveth-oz-receipt-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const copy = path.join(temp, 'openzeppelin');
  fs.cpSync(ozRoot, copy, { recursive: true });
  const matching = verify(copy);
  assert.equal(matching.status, 0, matching.output);

  const imported = path.join(copy, 'token', 'ERC20', 'ERC20.sol');
  const originalBytes = fs.readFileSync(imported);
  fs.appendFileSync(imported, '\n// receipt tamper fixture\n');
  const tampered = verify(copy);
  assert.notEqual(tampered.status, 0, tampered.output);
  assert.match(tampered.output, /ERC20\.sol: current source hash/);

  fs.writeFileSync(imported, originalBytes);
  const restored = verify(copy);
  assert.equal(restored.status, 0, restored.output);
  fs.rmSync(imported);
  const missing = verify(copy);
  assert.notEqual(missing.status, 0, missing.output);
});
