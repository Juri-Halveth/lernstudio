# EVE development tooling review — 24 October 2026

Scope: the separate local research package in `contracts/`. None of these npm
packages is a shipped Lernstudio browser dependency. The production allowlist in
`../werkzeug/public-files.js` excludes this package.

## Candidate maintenance change

- Pin `ethers` to **6.17.0**. Its published manifest pins `ws` to **8.21.0**.
- Keep the compiler at **solc 0.8.26**, matching the unchanged exact Solidity
  pragma. Override its helper dependencies to **tmp 0.2.7** and
  **follow-redirects 1.16.1**.
- Keep OpenZeppelin **4.9.6** and Ganache **7.9.2** unchanged. This maintenance
  candidate does not upgrade the Solidity source, compiler generation or EVM.
- The runtime's version gate now requires the new exact ethers pin. The ordinary
  `npm test` command and its eighteen local EVM cases retain their existing API.

The new `npm run test:tooling` command has four tests: compile the original
contract and inspect its callable ABI; sign and verify a synthetic EIP-712 voucher
and reject a changed domain; check the fixed helper resolutions and normal
temporary-file API; assert that no Ganache execution bundle or network connection
was used. Source identity uses explicit UTF-8/LF normalization to allow Windows
and Linux checkouts. Original checkout bytes are not claimed to be identical.

The initial compiler/signature-only review ran those four tooling tests. A
separately authorized local follow-up on **24 October 2026, 13:57 UTC** then ran
the unchanged eighteen-case transaction fixture against candidate
`42be5bcbc221ff26757a82e514c6d6edbd765748`: **18/18 passed**, followed by **4/4
tooling tests**. The in-process Ganache fixture used fresh synthetic accounts,
Shanghai/chain 31337, and socket/listener/TLS/fetch guards. Its receipt reports
unchanged bound sources and an empty blocked-network-attempt list. No public
chain, external RPC, injected wallet or existing account was used. On Node 24,
Ganache reported the already documented optional native µWS mismatch and used
its JavaScript fallback; no native module was installed for this run.

A minimized, source-bound result is in
[`validation/local-compatibility-20261024.json`](validation/local-compatibility-20261024.json).
Raw synthetic chain state remains outside Git. **Validation ceiling:** these
twenty-two named local checks establish their own compatibility cases. They do
not clear remaining bundled-code advisories, exhaust every execution path,
monitor all operating-system activity or establish production safety.

## Advisory and actual consumer map

| Package / old locked version | Advisory | Candidate / remaining route |
| --- | --- | --- |
| Top-level `ws` 8.17.1, through ethers 6.15.0 | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | ethers 6.17.0 brings ws 8.21.0. The local test uses an in-process provider and installs socket guards. |
| `tmp` 0.0.33, through solc | [GHSA-52f5-9888-hmc6](https://github.com/advisories/GHSA-52f5-9888-hmc6), [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65), subsequent [GHSA-7c78-jf6q-g5cm](https://github.com/advisories/GHSA-7c78-jf6q-g5cm) | Pin 0.2.7, including the follow-up type guard. solc's SMT helper uses `tmp.fileSync({postfix: '.smt2'})`; the local compile path has no caller-controlled path options. |
| `follow-redirects`, solc helper | [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8), [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c) | Pin 1.16.1. solc's remote-version loader is outside the pinned, network-denied compile path. |
| Ganache's bundled `elliptic` 6.5.4 | [GHSA-vjh7-7g9h-fjfh](https://github.com/advisories/GHSA-vjh7-7g9h-fjfh), [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) | Remains. The latter advisory lists no patched version; an arbitrary override cannot be called a complete remediation. |
| Ganache's bundled `secp256k1` 4.0.3 | [GHSA-584q-6j8j-r5pm](https://github.com/advisories/GHSA-584q-6j8j-r5pm) | Remains. Advisory fixed version is 4.0.4; the vulnerable ECDH operation is not part of the eighteen named fixture cases. This does not audit every internal Ganache call. |
| Ganache's nested `ws` 8.13.0 | [GHSA-3h5v-q93c-6h6q](https://github.com/advisories/GHSA-3h5v-q93c-6h6q), [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx), [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | Remains in the unused HTTP/WebSocket serving path. The existing harness denies `Server.listen` and only calls `ganache.provider`. |
| Ganache's `pbkdf2` 3.1.2, `sha.js` 2.4.11, `cipher-base` 1.0.4 | [GHSA-h7cp-r72f-jxh6](https://github.com/advisories/GHSA-h7cp-r72f-jxh6), [GHSA-v62p-rq8g-8h59](https://github.com/advisories/GHSA-v62p-rq8g-8h59), [GHSA-95m3-7q98-8xr5](https://github.com/advisories/GHSA-95m3-7q98-8xr5) | Preserve as bundled-code debt, even where a regenerated top-level lock no longer enumerates a nested package. The installed package source maps bind pbkdf2 to the Node bundle; sha.js and cipher-base occur in the separate browser bundle. Neither bundle is part of this site's public export. |

## Why the npm counter alone is insufficient

The preserved original lock produced **37 package-level audit entries**
(2 low, 6 moderate, 24 high, 5 critical). After exact updates and lock
normalization, a clean `npm ci --ignore-scripts` produced **7** entries
(1 moderate, 5 high, 1 critical). These are registry audit classifications of
different enumerated trees, not counts of demonstrated vulnerabilities in this
application. The numeric reduction also reflects pruning of Ganache shrinkwrap
metadata; it is not evidence that all omitted code disappeared.

Static inspection of the unchanged `ganache-7.9.2.tgz` found bundled elliptic
6.5.4 and secp256k1 4.0.3. Node source maps also contain pbkdf2; browser source maps
contain additional crypto modules. The tarball SHA-256 is
`b01fa458a186dc018469dc86093a2c843193e5ca890d03979cfa203a351ba878`.
No Ganache code was executed for this artifact inspection.

The [Ganache repository](https://github.com/ConsenSys-archive/ganache) is archived.
A repaired manifest cannot replace its prebuilt JavaScript modules or native
bundles. No `npm audit fix --force`, downgrade to Ganache 6, or automatic override
of the embedded cryptographic implementation was used.

## Conservative continuation

Keep the existing eighteen-case harness isolated from network, existing wallet
files and production assets. Before treating the EVM toolchain as maintained,
replace the **test adapter**, with the Solidity contract unchanged. One candidate
is a maintained in-process VM with an EIP-1193-compatible adapter; another is a
local maintained development node, which changes the current no-listener
contract and therefore needs an explicit scope decision. Either candidate must
replay all eighteen cases, Shanghai execution, typed signatures, roles, nonce and
lesson replay prevention, cap rollback, receipts and local-state cleanup under
the same oracle. No candidate adapter was installed, executed or approved here.

This is a bounded maintenance record. A registry clean result, compiler pass or
valid signature does not establish public-chain behavior, learning success,
token value or production approval.
