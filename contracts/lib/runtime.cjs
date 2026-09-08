// SPDX-License-Identifier: MIT
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
// Defaults to this package's npm installation. Overrides are optional local
// development paths; their absolute values never enter generated receipts.
const dependencyRoot = path.resolve(process.env.EVE_DEPENDENCY_ROOT || root);
const dependencyRequire = createRequire(path.join(dependencyRoot, 'package.json'));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const expected = { solc: '0.8.26', ethers: '6.15.0', ganache: '7.9.2', openzeppelin: '4.9.6' };

function packageDirectory(name) {
  let directory = path.dirname(dependencyRequire.resolve(name));
  for (;;) {
    const file = path.join(directory, 'package.json');
    if (fs.existsSync(file) && readJson(file).name === name) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error(`Cannot find package manifest for ${name}`);
    directory = parent;
  }
}

const ozRoot = process.env.EVE_OPENZEPPELIN_ROOT
  ? path.resolve(process.env.EVE_OPENZEPPELIN_ROOT)
  : path.dirname(dependencyRequire.resolve('@openzeppelin/contracts/package.json'));
const ozPackage = readJson(path.join(ozRoot, 'package.json'));
if (ozPackage.name !== '@openzeppelin/contracts') throw new Error('Expected the @openzeppelin/contracts package root');
const versions = { openzeppelin: ozPackage.version };
for (const name of ['solc', 'ethers', 'ganache']) {
  versions[name] = readJson(path.join(packageDirectory(name), 'package.json')).version;
}
for (const [name, version] of Object.entries(expected)) {
  if (versions[name] !== version) throw new Error(`Pinned ${name} version mismatch: ${versions[name]}`);
}
// Absolute paths are used only for local reads, never included in source receipts.
const boundSourceFiles = new Map();
function compile() {
  const solc = dependencyRequire('solc');
  const sourceName = 'src/EveLearningRewardsResearch.sol';
  const reads = new Map();
  function readBound(file, name) {
    const content = fs.readFileSync(file, 'utf8');
    boundSourceFiles.set(name, file);
    reads.set(name, { name, bytes: Buffer.byteLength(content), sha256: sha256(content) });
    return content;
  }
  const input = {
    language: 'Solidity',
    sources: { [sourceName]: { content: readBound(path.join(root, sourceName), sourceName) } },
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai',
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
    },
  };
  const importedSources = {};
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import(name) {
    if (!name.startsWith('@openzeppelin/contracts/')) return { error: 'Import outside pinned OpenZeppelin source root' };
    const file = path.resolve(ozRoot, name.slice('@openzeppelin/contracts/'.length));
    if (!file.startsWith(path.resolve(ozRoot) + path.sep)) return { error: 'Import path escaped pinned root' };
    try {
      const content = readBound(file, name);
      importedSources[name] = { content };
      return { contents: content };
    } catch { return { error: `Cannot read allowed import ${name}` }; }
  } }));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  if (errors.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  const artifact = output.contracts[sourceName].EveLearningRewardsResearch;
  if (artifact.evm.deployedBytecode.object.length / 2 > 24576) throw new Error('Runtime exceeds EVM size limit');
  return {
    compiler: solc.version(), input: { ...input, sources: { ...input.sources, ...importedSources } },
    artifact, sources: [...reads.values()],
    warnings: (output.errors || []).filter(e => e.severity !== 'error').map(e => e.formattedMessage),
  };
}
function endpointIntegrity(sources) {
  return sources.map(source => {
    const actual = sha256(fs.readFileSync(boundSourceFiles.get(source.name)));
    return { name: source.name, expected: source.sha256, actual, unchanged: source.sha256 === actual };
  });
}
function portableError(error) {
  let message = error.message;
  for (const [location, label] of [[root, '<package>'], [dependencyRoot, '<dependencies>'], [ozRoot, '<openzeppelin>']]) {
    message = message.replaceAll(location, label).replaceAll(location.replaceAll('\\', '/'), label);
  }
  return message;
}
module.exports = { root, dependencyRequire, versions, compile, sha256, endpointIntegrity, portableError };
