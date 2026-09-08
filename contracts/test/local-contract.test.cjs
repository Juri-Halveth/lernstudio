// SPDX-License-Identifier: MIT
'use strict';
// Only Ganache's in-process provider is used. No listener, remote RPC or fork.
const net = require('node:net');
const tls = require('node:tls');
const blockedNetworkAttempts = [];
const block = name => function () { blockedNetworkAttempts.push(name); throw new Error(`Network forbidden in local research: ${name}`); };
net.Socket.prototype.connect = block('net.Socket.connect');
net.Server.prototype.listen = block('net.Server.listen');
tls.connect = block('tls.connect');
globalThis.fetch = block('fetch');

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { root, dependencyRequire, versions, compile, sha256, endpointIntegrity, portableError } = require('../lib/runtime.cjs');
const ganache = dependencyRequire('ganache');
const { BrowserProvider, ContractFactory, Wallet, ZeroAddress, ZeroHash, id, parseEther } = dependencyRequire('ethers');

const runId = new Date().toISOString().replaceAll(':', '-');
const output = path.join(root, 'evidence', runId);
const relativeReceipt = path.posix.join('evidence', runId, 'test-receipt.json');
fs.mkdirSync(output, { recursive: true });
const CHAIN_ID = 31337;
const REWARD = parseEther('10'); // ILLUSTRATIVE TEST INPUT, not agreed tokenomics.
const CAP = parseEther('100');  // ILLUSTRATIVE TEST INPUT, not agreed tokenomics.
const types = { LearningVoucher: [
  { name: 'learner', type: 'address' }, { name: 'lessonId', type: 'bytes32' },
  { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' },
] };
const checks = [];
let compiled, evm, provider, admin, learner, other, attestor, forgedAttestor, nonce = 0n;
const check = (name, fn) => test(name, async () => {
  try { await fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', error: portableError(error) }); throw error; }
});
const sent = async promise => (await promise).wait();
async function deploy(cap = CAP, reward = REWARD, adminAddress, attestorAddress) {
  const factory = new ContractFactory(compiled.artifact.abi, compiled.artifact.evm.bytecode.object, admin);
  const contract = await factory.deploy(adminAddress ?? await admin.getAddress(), attestorAddress ?? attestor.address, cap, reward);
  await contract.waitForDeployment();
  return contract;
}
async function voucher(contract, overrides = {}, signer = attestor, domainOverrides = {}) {
  const value = {
    learner: await learner.getAddress(), lessonId: id(`local-lesson-${nonce}`), nonce: nonce++,
    deadline: BigInt((await provider.getBlock('latest')).timestamp + 3600), ...overrides,
  };
  const domain = { name: 'EveLearningRewardsResearch', version: '0-local', chainId: CHAIN_ID,
    verifyingContract: await contract.getAddress(), ...domainOverrides };
  return { value, signature: await signer.signTypedData(domain, types, value) };
}
async function rejected(contract, who, claim, expected) {
  await assert.rejects(() => contract.connect(who).claim.staticCall(claim.value, claim.signature), error => {
    if (!expected) return true;
    return error.revert?.name === expected || error.message.includes(expected);
  });
}
async function claim(contract, who, item) { return sent(contract.connect(who).claim(item.value, item.signature)); }

test.before(async () => {
  compiled = compile();
  fs.writeFileSync(path.join(output, 'compiler-input.json'), JSON.stringify(compiled.input, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'artifact.json'), JSON.stringify({
    state: 'LOCAL_RESEARCH_ONLY', contractName: 'EveLearningRewardsResearch', compiler: compiled.compiler,
    abi: compiled.artifact.abi, bytecode: '0x' + compiled.artifact.evm.bytecode.object,
    deployedBytecode: '0x' + compiled.artifact.evm.deployedBytecode.object,
  }, null, 2) + '\n');
  evm = ganache.provider({
    chain: { chainId: CHAIN_ID, hardfork: 'shanghai' }, logging: { quiet: true },
    // Explicit path confines Ganache's local test state to this research root.
    // Random provider accounts and disconnected attestors are generated fresh.
    database: { dbPath: path.join(output, 'local-evm-state') },
    wallet: { totalAccounts: 3, defaultBalance: 1000 },
  });
  provider = new BrowserProvider(evm, undefined, { cacheTimeout: -1 });
  provider.pollingInterval = 10;
  [admin, learner, other] = await Promise.all([0, 1, 2].map(i => provider.getSigner(i)));
  attestor = Wallet.createRandom();
  forgedAttestor = Wallet.createRandom();
});

test.after(async () => {
  provider?.destroy();
  await evm?.disconnect();
  const sourceIntegrity = endpointIntegrity(compiled?.sources || []);
  const localFiles = ['src/EveLearningRewardsResearch.sol', 'lib/runtime.cjs', 'test/local-contract.test.cjs', 'package.json', 'README.md', '.gitignore', 'LICENSE'];
  const receipt = {
    state: checks.length === 18 && checks.every(c => c.status === 'PASS') && sourceIntegrity.every(s => s.unchanged)
      && blockedNetworkAttempts.length === 0 ? '18_NAMED_LOCAL_CHECKS_PASS' : 'INCOMPLETE_OR_FAILED',
    recordedAt: new Date().toISOString(), scope: 'IN_PROCESS_EVM_ONLY', checks,
    compiler: compiled?.compiler, versions, node: process.version, evmVersion: 'shanghai', chainId: CHAIN_ID,
    illustrativeTestParameters: { standardCapEve: '100', capBoundaryEve: '20', rewardPerClaimEve: '10', tokenomicsAgreed: false },
    sources: compiled?.sources, sourceIntegrity,
    localFiles: localFiles.map(name => ({ name, sha256: sha256(fs.readFileSync(path.join(root, name))) })),
    warnings: compiled?.warnings, blockedNetworkAttempts, publicChainDeployment: false,
    externalRpc: false, listener: false, mainnetFork: false, existingWalletAccess: false,
    privateKeysPersistedByHarness: false, ephemeralTestSigners: true,
    localStateStorage: 'Ganache LevelDB inside this run directory; synthetic local chain data only',
    coverage: '18 named example checks, executed local transactions and rejected static calls; source hashes before/after. No exhaustive model, adversarial audit, verifier service, frontend, gas sponsor or production observation.',
    limitations: [
      'Authorized attestor claims, not proof of human understanding; attestor may issue false vouchers.',
      'No Sybil prevention or independent uniqueness of human learners.',
      'Attestor supports ECDSA EOAs only; no ERC1271 contract attestors.',
      'Admin can add/remove attestors and admins; key custody and governance are unresolved.',
      'Lesson identifiers are issuer-defined and not bound to an audited public curriculum registry.',
      'No bridges, crosschain supply accounting, rewards valuation or public-chain deployment.',
      'No pause mechanism, emergency recovery or per-voucher revocation; role revocation blocks that signer.',
      'No gas sponsorship; zero transfer tax is separate from network gas fees.',
      'OpenZeppelin is the locally inspected 4.9.6 snapshot, not a claim of latest release or dependency audit.',
    ],
  };
  fs.writeFileSync(path.join(output, 'test-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'latest-receipt.json'), JSON.stringify({ receipt: relativeReceipt, state: receipt.state }, null, 2) + '\n');
  console.log(JSON.stringify({ state: receipt.state, receipt: relativeReceipt }));
});

check('01 canonical ERC20 metadata, empty initial supply and immutable illustrative parameters', async () => {
  const c = await deploy();
  assert.equal(await c.name(), 'Verachel Learning Research'); assert.equal(await c.symbol(), 'EVE');
  assert.equal(await c.decimals(), 18n); assert.equal(await c.totalSupply(), 0n);
  assert.equal(await c.cap(), CAP); assert.equal(await c.rewardPerClaim(), REWARD);
});
check('02 authorized signed voucher mints the fixed amount and records learner plus lesson', async () => {
  const c = await deploy(); const v = await voucher(c); const receipt = await claim(c, learner, v);
  assert.equal(await c.balanceOf(v.value.learner), REWARD); assert.equal(await c.totalSupply(), REWARD);
  assert.equal(await c.lessonClaimed(v.value.learner, v.value.lessonId), true);
  assert.equal(await c.nonceUsed(v.value.learner, v.value.nonce), true);
  const event = receipt.logs.map(l => { try { return c.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LearningRewardClaimed');
  assert.equal(event.args.attestor, attestor.address); assert.equal(event.args.amount, REWARD);
});
check('03 repeated learner plus lesson rejects even with a fresh signed nonce', async () => {
  const c = await deploy(); const v = await voucher(c); await claim(c, learner, v);
  await rejected(c, learner, v, 'LessonAlreadyClaimed');
  await rejected(c, learner, await voucher(c, { lessonId: v.value.lessonId }), 'LessonAlreadyClaimed');
  assert.equal(await c.totalSupply(), REWARD);
});
check('04 a used learner nonce cannot authorize a different lesson', async () => {
  const c = await deploy(); const v = await voucher(c); await claim(c, learner, v);
  await rejected(c, learner, await voucher(c, { nonce: v.value.nonce }), 'NonceAlreadyUsed');
});
check('05 unauthorized signer rejects without consuming claim state', async () => {
  const c = await deploy(); const v = await voucher(c, {}, forgedAttestor);
  await rejected(c, learner, v, 'UnauthorizedAttestor');
  assert.equal(await c.lessonClaimed(v.value.learner, v.value.lessonId), false);
  assert.equal(await c.nonceUsed(v.value.learner, v.value.nonce), false);
});
check('06 caller must be the voucher learner', async () => {
  const c = await deploy(); await rejected(c, other, await voucher(c), 'WrongLearner');
});
check('07 replacing the signed recipient invalidates the attestation', async () => {
  const c = await deploy(); const v = await voucher(c);
  v.value.learner = await other.getAddress(); await rejected(c, other, v, 'UnauthorizedAttestor');
});
check('08 expired vouchers reject', async () => {
  const c = await deploy(); const timestamp = (await provider.getBlock('latest')).timestamp;
  await rejected(c, learner, await voucher(c, { deadline: BigInt(timestamp - 1) }), 'VoucherExpired');
});
check('09 voucher signed for one contract rejects on another contract', async () => {
  const a = await deploy(); const b = await deploy(); const v = await voucher(a);
  await rejected(b, learner, v, 'UnauthorizedAttestor'); await claim(a, learner, v);
});
check('10 wrong chain and named signing domain reject', async () => {
  const c = await deploy();
  await rejected(c, learner, await voucher(c, {}, attestor, { chainId: CHAIN_ID + 1 }), 'UnauthorizedAttestor');
  await rejected(c, learner, await voucher(c, {}, attestor, { name: 'AnotherDomain' }), 'UnauthorizedAttestor');
  await rejected(c, learner, await voucher(c, {}, attestor, { version: 'another-version' }), 'UnauthorizedAttestor');
});
check('11 hard cap rejects the next reward and rolls back nonce and lesson state', async () => {
  const c = await deploy(REWARD * 2n); await claim(c, learner, await voucher(c)); await claim(c, learner, await voucher(c));
  const v = await voucher(c); await rejected(c, learner, v, 'ERC20Capped: cap exceeded');
  await assert.rejects(async () => {
    await sent(c.connect(learner).claim(v.value, v.signature, { gasLimit: 500000n }));
  }, error => error.code === 'CALL_EXCEPTION');
  assert.equal(await c.totalSupply(), REWARD * 2n);
  assert.equal(await c.nonceUsed(v.value.learner, v.value.nonce), false);
  assert.equal(await c.lessonClaimed(v.value.learner, v.value.lessonId), false);
});
check('12 non-admin cannot grant or revoke the attestor role', async () => {
  const c = await deploy(); const role = await c.ATTESTOR_ROLE();
  await assert.rejects(() => c.connect(other).grantRole.staticCall(role, forgedAttestor.address));
  await assert.rejects(() => c.connect(other).revokeRole.staticCall(role, attestor.address));
  assert.equal(await c.hasRole(role, forgedAttestor.address), false);
});
check('13 admin revocation rejects old attestations and an explicitly granted replacement can sign', async () => {
  const c = await deploy(); const role = await c.ATTESTOR_ROLE(); const old = await voucher(c);
  await sent(c.revokeRole(role, attestor.address)); await rejected(c, learner, old, 'UnauthorizedAttestor');
  await sent(c.grantRole(role, forgedAttestor.address)); await claim(c, learner, await voucher(c, {}, forgedAttestor));
});
check('14 ordinary transfer moves the exact amount with zero token tax and unchanged supply', async () => {
  const c = await deploy(); await claim(c, learner, await voucher(c)); const amount = parseEther('3');
  await sent(c.connect(learner).transfer(await other.getAddress(), amount));
  assert.equal(await c.balanceOf(await learner.getAddress()), REWARD - amount);
  assert.equal(await c.balanceOf(await other.getAddress()), amount); assert.equal(await c.totalSupply(), REWARD);
  assert.equal(await c.balanceOf(await admin.getAddress()), 0n);
});
check('15 different learners can each claim the same lesson; no person-uniqueness claim', async () => {
  const c = await deploy(); const lessonId = id('shared-lesson');
  await claim(c, learner, await voucher(c, { lessonId }));
  await claim(c, other, await voucher(c, { learner: await other.getAddress(), lessonId }));
  assert.equal(await c.totalSupply(), REWARD * 2n);
});
check('16 empty lessons and malformed signatures reject', async () => {
  const c = await deploy(); await rejected(c, learner, await voucher(c, { lessonId: ZeroHash }), 'EmptyLesson');
  const v = await voucher(c); v.signature = '0x1234'; await rejected(c, learner, v, 'ECDSA: invalid signature length');
});
check('17 no payable purchase surface, public mint function, receive or fallback in ABI', async () => {
  const abi = compiled.artifact.abi;
  assert.equal(abi.some(x => x.stateMutability === 'payable' || ['receive', 'fallback'].includes(x.type)), false);
  assert.equal(abi.some(x => x.type === 'function' && /^(mint|buy|sell)$/i.test(x.name)), false);
  const c = await deploy(); const v = await voucher(c);
  const from = await learner.getAddress(); const to = await c.getAddress();
  await assert.rejects(() => provider.call({ from, to, value: 1n, data: '0x' }), error => error.code === 'CALL_EXCEPTION');
  await assert.rejects(() => provider.call({ from, to, value: 1n,
    data: c.interface.encodeFunctionData('claim', [v.value, v.signature]) }), error => error.code === 'CALL_EXCEPTION');
});
check('18 invalid constructor economics and zero authority addresses reject', async () => {
  await assert.rejects(() => deploy(CAP, 0n)); await assert.rejects(() => deploy(1n, 2n));
  await assert.rejects(() => deploy(0n, REWARD));
  await assert.rejects(() => deploy(CAP, REWARD, ZeroAddress));
  await assert.rejects(() => deploy(CAP, REWARD, undefined, ZeroAddress));
});
