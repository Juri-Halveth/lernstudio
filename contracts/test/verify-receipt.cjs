// SPDX-License-Identifier: MIT
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedFiles = [
  'src/EveLearningRewardsResearch.sol', 'lib/runtime.cjs',
  'test/local-contract.test.cjs', 'test/tooling-boundary.test.cjs',
  'test/verify-receipt.cjs', 'hardhat.config.ts', 'package.json',
  'package-lock.json', 'README.md', '.gitignore', 'LICENSE',
];
const expectedSources = [
  'src/EveLearningRewardsResearch.sol',
  '@openzeppelin/contracts/token/ERC20/ERC20.sol',
  '@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol',
  '@openzeppelin/contracts/access/AccessControl.sol',
  '@openzeppelin/contracts/utils/cryptography/EIP712.sol',
  '@openzeppelin/contracts/utils/cryptography/ECDSA.sol',
  '@openzeppelin/contracts/access/IAccessControl.sol',
  '@openzeppelin/contracts/utils/Context.sol',
  '@openzeppelin/contracts/utils/Strings.sol',
  '@openzeppelin/contracts/utils/introspection/ERC165.sol',
  '@openzeppelin/contracts/token/ERC20/IERC20.sol',
  '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol',
  '@openzeppelin/contracts/utils/ShortStrings.sol',
  '@openzeppelin/contracts/interfaces/IERC5267.sol',
  '@openzeppelin/contracts/utils/math/Math.sol',
  '@openzeppelin/contracts/utils/math/SignedMath.sol',
  '@openzeppelin/contracts/utils/introspection/IERC165.sol',
  '@openzeppelin/contracts/utils/StorageSlot.sol',
];
const latest = JSON.parse(fs.readFileSync(path.join(root, 'latest-receipt.json'), 'utf8'));
assert.match(latest.receipt, /^evidence\/[0-9T.\-Z]+\/test-receipt\.json$/);
const receiptFile = path.resolve(root, latest.receipt);
assert.equal(path.dirname(path.dirname(receiptFile)), path.join(root, 'evidence'));
const bytes = fs.readFileSync(receiptFile);
const receipt = JSON.parse(bytes);
assert.equal(receipt.state, '18_NAMED_LOCAL_CHECKS_PASS');
assert.equal(latest.state, receipt.state);
assert.equal(receipt.checks.length, 18);
assert(receipt.checks.every(check => check.status === 'PASS'));
assert.deepEqual(receipt.sourceIntegrity.map(source => source.name).sort(), [...expectedSources].sort());
assert(receipt.sourceIntegrity.every(source => source.unchanged && source.expected === source.actual));
assert.deepEqual(receipt.blockedNetworkAttempts, []);
assert.deepEqual(receipt.localFiles.map(item => item.name).sort(), [...expectedFiles].sort());
for (const item of receipt.localFiles) {
  const file = path.resolve(root, item.name);
  assert(file.startsWith(root + path.sep));
  assert.equal(sha256(fs.readFileSync(file)), item.sha256, item.name);
}
console.log(JSON.stringify({
  state: receipt.state,
  checks: receipt.checks.length,
  sourceIntegrity: true,
  networkAttempts: receipt.blockedNetworkAttempts.length,
  localFileHashesMatched: receipt.localFiles.length,
  receiptSha256: sha256(bytes),
}));
