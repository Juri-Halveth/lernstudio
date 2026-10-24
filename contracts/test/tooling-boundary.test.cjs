// SPDX-License-Identifier: MIT
'use strict';
// Compiler and signing compatibility only: this test never loads or starts an EVM.
const net = require('node:net');
const tls = require('node:tls');
const attempts = [];
const deny = name => () => { attempts.push(name); throw new Error('Network forbidden: ' + name); };
net.Socket.prototype.connect = deny('net.Socket.connect');
net.Server.prototype.listen = deny('net.Server.listen');
tls.connect = deny('tls.connect');
globalThis.fetch = deny('fetch');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, dependencyRequire, versions, compile, sha256 } = require('../lib/runtime.cjs');
const { Wallet, TypedDataEncoder, verifyTypedData, id } = dependencyRequire('ethers');

test('pinned compiler and patched tooling retain the original source and callable contract ABI', () => {
  assert.equal(versions.solc, '0.8.26');
  assert.equal(versions.ethers, '6.17.0');
  const source = fs.readFileSync(path.join(root, 'src/EveLearningRewardsResearch.sol'), 'utf8');
  assert.equal(sha256(source.replace(/\r\n/g, '\n')), '767ce9dd116940f79043268dd867dfd82434666d2ccf9c42df35f3922d0a4743');
  const result = compile();
  assert.match(result.compiler, /^0\.8\.26\+/);
  assert(result.artifact.evm.bytecode.object.length > 0);
  const claim = result.artifact.abi.find(row => row.type === 'function' && row.name === 'claim');
  assert.deepEqual(claim.inputs[0].components.map(row => [row.name, row.type]), [
    ['learner', 'address'], ['lessonId', 'bytes32'], ['nonce', 'uint256'], ['deadline', 'uint256']
  ]);
  assert.equal(claim.stateMutability, 'nonpayable');
  assert(result.artifact.abi.some(row => row.type === 'error' && row.name === 'UnauthorizedAttestor'));
});

test('EIP-712 signing stays domain-bound without a provider, wallet file or RPC', async () => {
  const signer = new Wallet(id('PUBLIC_SYNTHETIC_EVE_TOOLING_FIXTURE_ONLY'));
  const domain = { name: 'EveLearningRewardsResearch', version: '0-local', chainId: 31337,
    verifyingContract: '0x0000000000000000000000000000000000000001' };
  const types = { LearningVoucher: [
    { name: 'learner', type: 'address' }, { name: 'lessonId', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }
  ] };
  const value = { learner: signer.address, lessonId: id('tooling-lesson'), nonce: 7n, deadline: 2000000000n };
  const digest = TypedDataEncoder.hash(domain, types, value);
  assert.match(digest, /^0x[0-9a-f]{64}$/);
  const signature = await signer.signTypedData(domain, types, value);
  assert.equal(verifyTypedData(domain, types, value, signature), signer.address);
  assert.notEqual(verifyTypedData({ ...domain, chainId: 1 }, types, value, signature), signer.address);
  assert.equal(signer.provider, null);
});

test('compiler helper pins resolve to fixed versions and retain the normal temporary-file API', () => {
  const { createRequire } = require('node:module');
  const solcRequire = createRequire(dependencyRequire.resolve('solc'));
  assert.equal(solcRequire('tmp/package.json').version, '0.2.7');
  assert.equal(solcRequire('follow-redirects/package.json').version, '1.16.1');
  assert.equal(dependencyRequire('ws/package.json').version, '8.21.0');
  const tmp = solcRequire('tmp');
  const file = tmp.fileSync({ postfix: '.smt2' });
  try { assert(fs.statSync(file.name).isFile()); }
  finally { file.removeCallback(); }
  assert.throws(() => tmp.tmpNameSync({ prefix: ['inert-non-string'] }));
});

test('tooling checks never import the Ganache execution bundle or touch the network', () => {
  assert(!Object.keys(require.cache).some(file => /[\\/]ganache[\\/]dist[\\/]node[\\/]/.test(file)));
  assert.deepEqual(attempts, []);
});
