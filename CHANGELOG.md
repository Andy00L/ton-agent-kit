# Changelog

All notable changes to this repository are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Packages under the `@ton-agent-kit` npm scope carry their own versions. The
version numbers below track the repository snapshot, not any single package.

## [1.1.0] - 2026-09-16

Maintenance release. The repository now installs and typechecks from a clean
clone, which it did not before.

### Fixed

- **`npm install` was broken.** npm 9 and later refused the repository with
  `EOVERRIDE: Override for zod@^4.3.6 conflicts with direct dependency`. The
  root `overrides` block now references the direct dependency with
  `"zod": "$zod"`, the form npm requires when overriding a package the root
  also depends on.
- **`npm run build` reported 126 typecheck errors.** It now reports none. The
  errors are described under Changed below, because several of them were
  runtime bugs the compiler had been prevented from seeing.
- **Wallet v5 addresses were derived from an incomplete wallet id.** The
  `walletId` passed to `WalletContractV5R1.create` put `workchain` and
  `subwalletNumber` next to `networkGlobalId` instead of inside the client
  context the type declares, so both were dropped. A non-zero workchain or a
  non-zero subwallet number therefore derived a different address from the one
  the caller asked for.
  sourceRef: `@ton/ton/dist/wallets/v5r1/WalletV5R1WalletId.d.ts`
- **Transfers were signed without a send mode.** `createTransfer` has no
  default for `sendMode`, so every call that omitted it serialized an undefined
  mode. All send paths now pass `PAY_GAS_SEPARATELY + IGNORE_ERRORS`, exported
  as `DEFAULT_SEND_MODE`.
- **`swap_best_price` crashed inside its own error handler.** `quotes` was
  declared inside the `try`, and the `catch` read `quotes.length`, which threw
  a `ReferenceError` and hid the original failure.
- **`swap_best_price` read the wrong fields off the Omniston transfer.**
  `TonMessage` carries `targetAddress` and `sendAmount`; the code read
  `address` and `amount`, so `Address.parse(undefined)` threw on every swap.
  sourceRef: `@ston-fi/omniston-sdk/dist/index.d.ts`
- **`sendTransaction` compared the post-send seqno against itself.** The seqno
  is now read before the transfer, so confirmation means it actually moved.
- **`create_escrow` declared an input type missing three of its own schema
  fields** (`requireRepCollateral`, `minRepScore`, `baseSellerStake`), so they
  were invisible to every typed caller.
- **`@ton-agent-kit/plugin-agent-comm` was published with only `name`,
  `version` and `main`.** It now declares its description, types entry,
  dependencies (`@ton-agent-kit/core` and `@ton-agent-kit/plugin-identity`,
  which its actions import), peer dependencies, license, keywords and
  repository. Without the dependency entry, a standalone install could resolve
  without `plugin-identity`.
- **`@ton-agent-kit/strategies`** was missing its types entry, dependencies,
  keywords, repository and publish access. Same treatment.
- **17 package descriptions carried a double-encoded em dash** that rendered as
  mojibake on npmjs.com. All descriptions now use plain punctuation.
- **Four packages declared a `tsc` build with no `tsconfig.json`**
  (`plugin-analytics`, `plugin-escrow`, `plugin-identity`, `plugin-staking`),
  so `tsc` emitted `.js` and `.d.ts` files next to the sources and skipped most
  of the typechecking. They now extend `tsconfig.base.json` like every other
  package, and `.gitignore` refuses the stray output.
- Removed a stray `nul` directory at the repository root, a Windows redirection
  artifact that broke `git status` in some shells.

### Changed

- **External JSON is validated at one boundary.** `@ton-agent-kit/core` now
  exports `fetchJson(url, schema, init)`, which returns
  `{ ok: true, value } | { ok: false, reason }`. Network failures, non-2xx
  responses, unparseable bodies and unexpected shapes all arrive as values
  instead of exceptions. The 33 `await response.json()` call sites across the
  plugins were moved onto it, each with a zod schema naming only the fields it
  reads. This is what closed 76 of the 126 typecheck errors: `response.json()`
  returns `unknown` under current `@types/node`, and the code was reading
  fields straight off it.
- **Cross-package imports go through package names.** Nine files imported a
  sibling package through a relative path into its `src` (for example
  `../../../plugin-identity/src/reputation-config`). That resolves only under a
  flat `node_modules` layout, breaks under pnpm, and pulled the sibling's files
  outside the compiling package's `rootDir`. `@ton-agent-kit/plugin-identity`
  now exports the helpers those packages need.
- **Wallet contract construction lives in one place.** `createWalletContract`,
  `openWalletContract` and `sendFromWalletContract` are exported from
  `@ton-agent-kit/core`; `sendTransaction` and the token plugin use them
  instead of each rebuilding the contract with their own hardcoded workchain.
- **No `any` left in the files this release touches.** `catch (err: any)` blocks
  became `catch (error: unknown)` with the exported `describeError`, TVM stack
  parsers moved into `packages/plugin-agent-comm/src/stack-parsers.ts` with a
  declared `TvmStackItem` type (they were copy-pasted in two files), and the
  agent registry, the Redis replay store and the endpoint plugin handlers got
  real types.
- Dependency refresh inside the current majors: `@modelcontextprotocol/sdk`
  1.27.1 to 1.30.0, `@ston-fi/omniston-sdk` 0.7.8 to 0.7.9, `dotenv` 17.3.1 to
  17.4.2, `grammy` 1.41.1 to 1.46.0, `openai` 6.28.0 to 6.49.0, `zod` 4.3.6 to
  4.6.5.
- `@ton-agent-kit/wallet-store` declares `@types/bun` and an `engines.bun`
  field. It imports `bun:sqlite`, so it has always required Bun; now that is
  written down and the package typechecks.

### Added

- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and pull request
  templates, and a CI workflow that installs, builds, and refuses a committed
  `.env` or mnemonic.
- `fetchJson`, `describeError`, `isSigningWallet`, `createWalletContract`,
  `openWalletContract`, `sendFromWalletContract` and `DEFAULT_SEND_MODE` are
  now part of the `@ton-agent-kit/core` public surface.

## Known issues

1. **`npm audit` reports advisories that cannot be cleared today**, one of them
   critical (`protobufjs`, reached through `@ston-fi/omniston-sdk`).
   `npm audit fix` wants `@ai-sdk/provider-utils` 3.x, which requires `ai` 5 or
   later, while `@ton-agent-kit/ai-tools` targets `ai` 3.4. Clearing the tree
   means upgrading `ai` from 3 to 7 and `@ston-fi/sdk` from 1 to 2, both
   breaking.
2. **`@ton/ton` 16.3.0 has not been adopted.** The range stays `^16.2.2`. The
   release changes the wallet v5 types and the shape of
   `account.balance.coins`, so it needs a pass with on-chain tests.
3. **The `tests/` scripts are not wired to a runner.** Several packages declare
   `"test": "jest"` with no jest configuration, so `npm test` does nothing
   useful. The numbered scripts under `tests/` run individually against
   testnet.
4. **`any` still exists outside the files this release touched**, mostly in the
   Tact contract bindings and the reputation helpers.

## Earlier history

Releases before 1.1.0 were published to npm without a changelog entry. Package
versions and their publication dates are visible on npm under the
[@ton-agent-kit](https://www.npmjs.com/org/ton-agent-kit) scope.
