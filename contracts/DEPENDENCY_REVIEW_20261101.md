# EVE local test adapter and dependency review — 1 November 2026

## Bound scope

This is the separate `contracts/` research harness. It is a development dependency tree, excluded from the published Lernstudio browser file list. It does not deploy a contract, access an existing wallet or connect to a public chain. The Solidity contract, compiler version `0.8.26`, OpenZeppelin `4.9.6`, ethers `6.17.0`, the 18 transaction cases and the original four compiler/signature tooling cases remain the comparison oracle. The [24 October review](DEPENDENCY_REVIEW_20261024.md) and its validation record remain historical source evidence.

## Replacement

The previous `ganache@7.9.2` dependency contained archived, prebuilt components responsible for 13 open GitHub Dependabot advisories in the old lockfile. A lockfile override could not replace those bundled implementations. The candidate removes Ganache and uses `hardhat@3.21.2` with an in-process EDR connection created through `network.create({ network: 'eveLocal' })`. The only configured network is `edr-simulated`, L1, Shanghai, chain ID 31337, with three funded accounts generated from fresh in-process entropy on each run. The config has no HTTP URL or fork. The test calls `connection.close()` and keeps the chain state in process memory.

`throwOnTransactionFailures: false` returns a hash for a reverted transaction so ethers can observe its status-0 receipt. This preserves the original test 11 oracle: the cap failure yields `CALL_EXCEPTION`, and supply, nonce and lesson state are rolled back. Failed `eth_call` behavior remains at the EDR default and the other rejection tests are unchanged.

The harness disables Hardhat telemetry before import and hooks Node's `net.Socket.connect`, `net.Server.listen`, `tls.connect` and global `fetch` to throw and record attempts. The tests report zero attempts through those hooks. This is a bound API guard, not complete operating-system network observation. EDR is loaded from the local package root; an external `EVE_DEPENDENCY_ROOT` is rejected before provider creation because the Hardhat config also resolves local packages. The compiler-only tooling path retains its separately version-checked override. `EVE_OPENZEPPELIN_ROOT` remains a source override.

With a foreign `EVE_OPENZEPPELIN_ROOT`, the receipt binds the read source hashes plus the declared package name and version. That does not establish that those bytes came from the locked npm tarball. The default CI path uses the local package root.

## New dependency boundary

The lockfile pins `hardhat 3.21.2`. `solc`'s helper overrides pin `tmp 0.2.7` and `follow-redirects 1.16.2`. Hardhat currently declares Zod 3; the package override selects patched `zod 4.6.7` for [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). This crosses a declared major range and is a conscious compatibility boundary. The in-process network creation, EIP-1193 bridge, contract calls and rollback oracle are tested; other Hardhat CLI, plugin and compiler workflows are outside this validation. Hardhat requires Node at least 22.13; the manifest now enforces `>=22.13 <25`.

## Local verification and remaining checks

On Windows with Node 24.18, a fresh `npm ci --ignore-scripts` installed the candidate lockfile. The original four tooling cases, the new external-root rejection case and all 18 named local EVM transaction cases passed. A fresh local `npm audit` of this exact candidate lockfile reported zero package advisories on 1 November 2026. The repository PR workflow now has a separate Node 24 Linux `contracts` job to check installation and both suites; its result must be read from the actual PR run. The native EDR package must be present for each platform; a Windows pass does not establish Linux or other-architecture compatibility.

The replacement removes the old Ganache dependency graph from the candidate lockfile. GitHub Dependabot alert closure is a separate post-merge observation. A zero audit counter and these named tests do not prove absence of vulnerabilities, full network isolation, production-chain behavior, human learning, token value or authorization for deployment.
