# Dependency review — 2026-10-10

## Scope and observed state

This review is limited to the local EVE learning-rewards research package under contracts/. Its dependencies are declared as development dependencies. The README describes the harness as local-only, with synthetic accounts and no public-chain RPC or deployment path.

After Dependabot alerts were enabled on 2026-10-10, GitHub showed 68 open alerts for contracts/package-lock.json (6 critical, 31 high, 19 moderate, 12 low). This is the observed pre-patch GitHub alert view, not a claim that the prototype was deployed or exposed.

## Changes in this candidate

- Updated ethers from 6.15.0 to 6.17.0.
- Updated solc from 0.8.26 to 0.8.37, including the exact Solidity pragma and the runtime version assertion.
- Pinned solc's temporary-file dependency to patched tmp 0.2.7; solc 0.8.37 otherwise selects tmp 0.2.6.
- Added weekly Dependabot updates for GitHub Actions, the root npm manifest, and contracts/package.json.
- Preserved the full Ganache bundled-dependency inventory in the lockfile. A package-manager re-resolution had removed most bundled records, which would have understated the known findings, so that compact result was not retained.

## Verification

- npm ci --ignore-scripts completed.
- The local contract suite passed all 18 named checks.
- Local npm audit on the candidate lockfile reported 36 findings: 1 low, 8 moderate, 22 high, and 5 critical.
- All five remaining critical dependency paths are inside the ganache@7.9.2 bundle: cipher-base, elliptic, pbkdf2, sha.js, and webpack.
- The npm registry still reports ganache@7.9.2 as the latest release. npm's force-fix suggestion would downgrade Ganache to 6.4.5, a breaking major-version change; that route was not used.
- Ganache's optional µWS native module did not match this Windows Node build; its documented JavaScript fallback ran and all 18 tests passed.

The remaining bundled findings require a separately reviewed replacement or isolation design for the local EVM test backend. Do not treat this candidate's passing tests as remediation of those five critical findings or as production approval. No contract deployment, wallet access, or public-chain request was made.