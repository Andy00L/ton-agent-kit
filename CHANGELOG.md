# Changelog

All notable changes to this repository are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Packages under the `@ton-agent-kit` npm scope carry their own versions. The
version numbers below track the repository snapshot, not any single package.

## [1.2.0] - 2026-09-16

Second audit pass, concentrated on the paths that move money. Three defects in
`@ton-agent-kit/x402-middleware`, one of them a complete paywall bypass. That
package goes to 2.0.0; nothing else changed.

### Fixed

- **Any endpoint priced under 0.005 TON was free.** The amount check waived a
  flat 5,000,000 nanoton (0.005 TON) regardless of price, so the acceptance
  floor went negative and a transfer of 0 TON satisfied it. The middleware's own
  documented example charges 0.001 TON, and `examples/x402-server` sells
  `/api/price` at that price, so the shipped example was exploitable. The waiver
  now covers a forward fee and never exceeds 10% of the price, which keeps the
  floor strictly positive at every price. The rule lives in one exported
  function, `minimumAcceptableNanoton`, instead of being copy-pasted into both
  verification paths.
- **One payment could be spent many times concurrently.** Verification called
  `has()` then `add()`, a check-then-act race. Fifty concurrent requests
  carrying the same hash all cleared `has()` before any reached `add()`, and all
  fifty were served. `ReplayStore` gains an optional atomic `claim()`,
  implemented by all three shipped stores, and verification now grants access on
  the claim rather than on a blind `add()`. `RedisReplayStore.claim()` uses
  `INCR`, which is atomic and spelled the same in ioredis, node-redis and the
  Upstash client, so the guarantee holds across processes rather than only
  inside one.
- **The default replay store threw on every call in an ESM project, and the
  failure was silent.** `FileReplayStore` reached for `require()` inside a
  module that consumers compile themselves. Under ESM `require` is undefined,
  the constructor swallowed the error and started with an empty set, which
  forgets every hash already spent and makes every past payment replayable. The
  module now imports from `node:fs` statically. A constructor that finds an
  unreadable store file refuses to start instead of starting empty, and `add()`
  rejects instead of logging when it cannot persist.
- **`FileReplayStore.add()` could truncate the store.** It wrote the whole set
  over the live file, so a crash mid-write lost every recorded hash. It now
  writes a sibling file and renames it into place.
- **A paywall with no recipient served payment instructions pointing at the
  string `configure-recipient`** and verified against an empty address.
  `tonPaywall` now validates the recipient and the amount when it is
  constructed, and throws rather than starting in a state where it cannot reject
  an invalid payment.

### Added

- `packages/x402-middleware/test/verification.test.mjs`: four regression checks
  covering the acceptance floor, an honest payment short by a forward fee, fifty
  concurrent claims on one hash, and a store that cannot persist. No framework
  and no network, run by CI on every push.

### Breaking, @ton-agent-kit/x402-middleware 2.0.0

- `tonPaywall` throws when `recipient` is missing or unparseable, or when
  `amount` is not a positive number. Supply both.
- Endpoints priced below roughly 0.005 TON were accepting unpaid requests. They
  now reject them, so real traffic on those routes will start being charged.
- `RedisLikeClient` requires `incr`. ioredis, node-redis and the Upstash client
  all have it; a hand-written client needs it added.
- `FileReplayStore` throws when its file exists but cannot be read, and `add()`
  throws when it cannot write.

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
  the caller asked for. **Read the upgrade note below before updating.**
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

## Upgrade note: wallet v5 addresses

The wallet id fix changes the derived address for some configurations. Checked
against `@ton/ton` 16.2.2:

| Configuration | Address |
|---|---|
| `workchain: 0`, `subwalletNumber: 0` (the default, mainnet and testnet) | unchanged |
| `subwalletNumber` other than 0 | **changes** |
| `workchain` other than 0 | **changes** |

If you used the defaults, nothing moves and there is nothing to do. If you set a
custom `subwalletNumber` or `workchain`, the address this version derives is the
correct one for that configuration, and your funds are at the address the
previous version derived. Recover them by pinning the previous package version,
sweeping the balance, then upgrading.

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
3. **Correction to the line that stood here.** An earlier revision claimed the
   `tests/` scripts have no runner. They do: `tests.ts` at the repository root
   is an interactive runner (`bun run tests.ts`), documented in the README, and
   it covers 28 suites. What is true is narrower: several packages still
   declare `"test": "jest"` with no jest configuration. `core`,
   `x402-middleware` and `wallet-store` now run real checks through `npm test`.
4. **The contracts have no test harness.** `tests/20-x402-security.ts` covers
   replay and the wrong recipient but never an underpayment, which is why the
   paywall bypass fixed in 1.2.0 survived it. There is no `@ton/sandbox` or
   Blueprint setup, so `contracts/escrow.tact` and `contracts/reputation.tact`,
   which hold funds, are covered only by scripts that run against live testnet.
5. **`any` still exists outside the files this release touched**: 23 occurrences
   in `core/src/agent.ts`, 11 in `wallet-store`, 11 in
   `plugin-identity/src/reputation-helpers.ts`, and the generated Tact
   bindings.

## Earlier history

Releases before 1.1.0 were published to npm without a changelog entry. Package
versions and their publication dates are visible on npm under the
[@ton-agent-kit](https://www.npmjs.com/org/ton-agent-kit) scope.
