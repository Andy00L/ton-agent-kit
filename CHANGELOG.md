# Changelog

All notable changes to this repository are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Packages under the `@ton-agent-kit` npm scope carry their own versions. The
version numbers below track the repository snapshot, not any single package.

## [1.3.0] - 2026-09-16

Third and fourth audit passes. The third closed a key-loss path, a fabricated
transfer recipient and a cache that served write actions. The fourth went after
optimization, readability and the arithmetic that moves money, and found that
three packages had never been typechecked at all.

### Fixed

- **`transfer_jetton` sent a thousand times the requested amount for any
  six-decimal token.** Every jetton amount in the kit was built with
  `parseFloat(amount) * 1e9`. TonAPI answers `"decimals": "6"` for USDT on TON,
  and the action's own example is "Send 100 USDT", which built 100000000000
  base units, that is 100,000 USDT. Decimals are now read off the jetton master
  and the transfer is refused when they cannot be read.
- **`swap_best_price` formatted both legs at nine decimals.** A real 38.5 USDT
  quote came back as `"0.0385"`, and the derived price string carried the same
  error. Decimals are resolved per leg, the two lookups in parallel.
- **`swap_dedust` threw `RangeError` on any fractional slippage.**
  `BigInt(100 - 0.5)` cannot be built, so 0.5% and 2.5% both failed outright,
  and `slippage: 0` was silently read as 1% through a `||` default. The
  arithmetic runs in basis points.
- **The `DOGS` entry in the `swap_best_price` token map was never an address.**
  Fifty characters carrying a literal `-none-` placeholder, which
  `Address.parse` rejects. Deleted. The other four parse.
- **Every on-chain rating was built with the wrong opcode.**
  `reputation-helpers.ts` carried four opcodes copied by hand from the compiled
  Tact wrapper. `OP_RATE` read 2804297358 while the contract answers to
  1335410632, a value that appears nowhere else in the repository. The
  generated `loadRate` returns `Invalid prefix` for that body, so
  `get_agent_reputation` with `addTask=true` burned a bounced transaction and
  still reported `onChain: true`. The four hand-rolled builders are deleted in
  favour of the generated `storeX` serializers.
- **`createDcaStrategy` and `createPriceMonitorStrategy` called an action that
  does not exist.** Both named `get_token_price`; the DeFi action is
  `get_price`. Both templates failed on their first step, on every run.
- **Any schedule longer than 24.8 days became a 1 ms interval.** 30 days is
  2,592,000,000 ms, past the 2^31-1 that Node timers hold, so Node substituted
  1: measured at 28 ticks in 402 ms, a monthly strategy firing about a hundred
  times a second. `parseSchedule` refuses it, and refuses a zero interval too.
- **Scheduled ticks overlapped.** `setInterval` does not wait for an async
  callback, so a run that outlived its interval started again on top of itself
  and the second run's `reset()` cleared results the first was still reading.
- **`createPaymentServer` threw `ReferenceError: require is not defined`.** It
  reached for `require("express")` in a module Node parses as an ES module. The
  1.2.0 release fixed exactly this inside `FileReplayStore` and missed this one.
- **Every paid route built its own default replay store over the same file.**
  `new FileReplayStore()` was written as a destructuring default, evaluated per
  `tonPaywall()` call, so four routes held four stores with four in-memory sets
  and every write erased the other three. A restart then made every payment on
  every other route replayable. The default is one shared instance per file
  path, exported as `defaultReplayStore`.
- **One verified payment served unlimited responses for `proofTTL` seconds.**
  The cache exists so a client that paid and lost the response can retry, but
  nothing counted the uses. At the 300 second default that is one 0.001 TON
  payment buying every request carrying its hash for five minutes. The budget
  is three.
- **`register_agent` threw out of its handler** on a JSON `capabilities` string
  that did not decode to an array, because `JSON.parse` returns `any` and
  `{"a":1}` reached `capabilities.join`.
- **The action cache served mutating actions, and the third pass only half
  fixed it.** That pass replaced the denylist with an allowlist, `isCacheable`,
  and wrote a comment on it claiming the hole was closed. `get` and `set` were
  never moved onto it: both kept consulting the denylist, so any action neither
  list had been taught was still cached. `delete_context`, `save_context`,
  `open_x402_endpoint` and `close_x402_endpoint` all returned a cached success
  without running. The existing checks passed because they called `isCacheable`
  directly and never went through the cache. Both guards now call it, and the
  new checks go through `set` and `get`.
- **`isCacheable` answered true for inherited Object properties.**
  `actionName in this.actionTTLs` walks the prototype chain, so `"toString"`
  was cacheable and `getTTL("toString")` returned a function. Every expiry
  comparison against it was NaN, which made such an entry immortal. It uses
  `Object.hasOwn` now.
- **One task naming an agent that is not registered hung the whole swarm.**
  `Dispatcher.executeTask` threw for a missing agent, and the parallel branch
  turned every rejection into `taskId: "unknown"`, so `pending.delete` removed
  nothing and the loop re-selected the same tasks forever with no await between
  iterations. Measured at 148 seconds of CPU and 1.15 GB before it was killed
  by hand. Every result now carries the id of the task it came from.
- **Delivery proofs and escrow ratings called a method the context never had.**
  Thirteen call sites across three plugins reached for
  `(agent as any).runAction(...)`. `runAction` lives on `TonAgentKit`, not on
  the `AgentContext` a handler receives, so every call was a TypeError inside a
  try with an empty catch. x402 delivery proofs were never stored and
  `get_delivery_proof` always answered `{ found: false }`; `confirm_delivery`
  was never called, so `escrowConfirmed` was always false; escrow release,
  refund and auto-release never queued their pending ratings. `AgentContext`
  declares `runAction` now and the casts are gone.
- **`swap_stonfi` accepted any output, including zero.** All three branches
  passed `minAskAmount: toNano("0")` while the action advertised a `slippage`
  parameter no line in the file read. It requires `minReceived` now, converted
  in the destination token's own decimals.
- **`await agent.methods` ended the process.** The proxy answered a function
  for every key including `then`, which made it a thenable: awaiting it called
  `runAction("then", resolve)`, which rejected and called neither callback, so
  it surfaced as an unhandled rejection rather than a catchable error.
- **A stored file whose blob was missing from disk could never be deleted.**
  `FileStore.deleteFile` went through `getFile`, which answers null in that
  case, so the row survived, held part of the user's 50 MB quota forever, and
  `cleanupExpired` re-selected it on every sweep and returned 0 each time. The
  row goes first now. `deleteAllFiles` and `cleanupExpired` were also quadratic
  in directory entries, one full directory scan per file removed.
- **The MCP server died when a second SSE client connected**, because one
  Server holds one transport and nothing caught the rejection from an async
  handler. It answers 409 now. It also printed 12 of the 64 hex characters of
  the bearer token on every boot.
- **`transfer_ton` rejected every wallet that is not V5R1**, including on the
  plain send path: the simulation guard ran before the simulate flag was read,
  so a V4 wallet failed with a simulation error and never reached
  `sendTransaction`, which handles every version. A plain transfer also paid
  for a client, a seqno round trip and a signature whose result nothing used.
- **`get_domain_info` and `lookup_address` always queried mainnet** and refused
  to run without a TONAPI key, while `resolve_domain` in the same file branches
  on the network and works keyless.
- `runLoop` read `choices[0].message` with no guard, so a provider answering
  with an empty choices array threw out of the loop instead of ending it.
- The dispatcher's retry path asserted non-null on a value that is null when
  `maxRetries` is below zero, throwing out of the function whose job is to
  report failures. It also attached a `_context` bag to task params that no
  handler ever received, because `runAction` parses params through the action's
  Zod schema and zod strips unknown keys.
- `EventBus` used a TypeScript parameter property, which Node's type stripping
  refuses outright. Every package here publishes its source as `main`, so a
  consumer on `--experimental-strip-types` could not load that file at all. It
  was the only one in the repository.
- Third-pass fixes, previously unrecorded here: a key-loss path in
  `ensureServerSecret`, and an argument remapper in `runLoop` that could rename
  a jetton master address into the `to` field of a transfer.

### Changed

- **Three packages had no build script, so CI never typechecked them.**
  `npm run build` resolves to `npm run build --workspaces --if-present`, which
  skips a workspace silently. `x402-middleware` (the package that went to 2.0.0
  for a paywall bypass), `strategies` and `plugin-agent-comm` had none: 2837
  lines went through CI unchecked. All three now declare a tsconfig and a
  build. The first two were clean. `strategies` was not.
- **`strategies` did not compile.** Every lifecycle hook was called with the
  strategy name in place of its first declared argument, `strategy.onError`
  received two of the three arguments it declares, `onComplete` was called with
  two different shapes on two paths, and `StrategyContext` declared no
  `getResult` although every template calls it. Eleven errors, now zero.
- **Token amount conversion lives once**, in `@ton-agent-kit/core`, as
  `toBaseUnits` and `fromBaseUnits`. Both work on the decimal string and never
  touch `Number`, so a balance above 2^53 keeps every digit and a small one
  does not come back in scientific notation. `toBaseUnits` returns a reason
  rather than a guess for scientific notation, signs, junk, and more decimal
  places than the token declares.
- `TONAPI_ENDPOINTS`, `tonapiBase`, `tonapiHeaders` and `fetchJettonMetadata`
  are exported from core. Five packages were rebuilding the endpoint ternary
  inline, sixteen times between them.
- The documentation was checked claim by claim against the code. Two examples
  called methods that do not exist, `docs/x402-protocol.md` still published the
  amount tolerance that was the paywall bypass, two version tables were wrong
  in 21 of 21 rows, and `examples/telegram-bot` was referenced four times
  without existing. The README gained the clone-and-build section it never had,
  and a Known limitations section.
- 150 long dashes across the 28 test suites and the runner became commas.

### Published versions

Twelve packages changed. Four carry a breaking change, named below.

| Package | From | To |
|---|---|---|
| `@ton-agent-kit/core` | 1.3.0 | 1.4.0 |
| `@ton-agent-kit/plugin-token` | 1.1.3 | **2.0.0** |
| `@ton-agent-kit/plugin-defi` | 1.2.4 | **2.0.0** |
| `@ton-agent-kit/strategies` | 1.0.2 | **2.0.0** |
| `@ton-agent-kit/x402-middleware` | 2.0.0 | **3.0.0** |
| `@ton-agent-kit/plugin-identity` | 1.7.0 | 1.8.0 |
| `@ton-agent-kit/plugin-escrow` | 1.5.4 | 1.6.0 |
| `@ton-agent-kit/plugin-payments` | 1.0.19 | 1.1.0 |
| `@ton-agent-kit/plugin-dns` | 1.0.5 | 1.1.0 |
| `@ton-agent-kit/orchestrator` | 1.1.2 | 1.2.0 |
| `@ton-agent-kit/mcp-server` | 1.1.2 | 1.2.0 |
| `@ton-agent-kit/wallet-store` | 1.0.2 | 1.1.0 |

Six plugins now require `@ton-agent-kit/core` 1.4.0 or later, because they call
`toBaseUnits`, `fetchJettonMetadata`, `tonapiBase` or `AgentContext.runAction`,
none of which exist earlier. Their ranges were widened to match; installing an
older core alongside them brings back the exact silent failures this release
closes.

### Breaking, @ton-agent-kit/plugin-token 2.0.0

- `transfer_jetton` reads the jetton master's declared decimals before building
  the amount, so it makes one HTTP call it did not make before, and it returns
  `{ status: "rejected", reason }` when the decimals cannot be read rather than
  assuming nine. Amounts for any token that does not declare nine decimals
  change: a call that moved 100,000 USDT now moves 100.
- Its result no longer carries `txHash`, `explorerUrl` or `fee`.
  `sendTransaction` returns nothing, so the hash was the literal string
  "pending" and the link pointed at `/transaction/pending`. It reports
  `symbol`, `decimals`, `baseUnits` and `attached` instead.

### Breaking, @ton-agent-kit/plugin-defi 2.0.0

- `swap_stonfi` requires `minReceived`, the smallest acceptable output in the
  destination token's units, and no longer accepts `slippage`. It never quoted
  the pool, so the slippage parameter could not be honoured and every swap went
  out with a floor of zero.
- `swap_best_price` resolves decimals per leg, which costs up to two HTTP calls
  before the quote, and returns a failure when a token declares none. Reported
  output amounts change for any token that is not nine decimals.
- The `DOGS` symbol no longer resolves. Its entry was never a TON address.

### Breaking, @ton-agent-kit/strategies 2.0.0

- Every `StrategyRunner` hook is now called with the arguments it declares.
  `onStepStart(step, context)`, `onStepComplete(stepResult, context)`,
  `onStepSkipped(step, context)` and `onStepError(error, step, context)` all
  used to receive the strategy name in first position.
- `strategy.onComplete` always receives a `StrategyResult`. One path passed a
  `StepResult[]`.
- `StrategyContext` declares `getResult`, `getVariable` and `setVariable`, so a
  hand-written context must supply them.
- `parseSchedule` throws for an interval of zero and for anything longer than
  24.8 days, which Node's timers cannot hold.

### Breaking, @ton-agent-kit/x402-middleware 3.0.0

- A verified payment now serves at most three responses inside `proofTTL`
  rather than an unlimited number. A client that legitimately retries more than
  three times with one hash receives a 402 naming the reason.
- `createPaymentServer` imports `express` at module load instead of calling
  `require`, so `express` must resolve when the module is imported, not when
  the function is called. It previously threw `ReferenceError` on every call.
- `defaultReplayStore(filePath?)` is exported, and every paywall that names no
  store shares one instance per file path.

### Added

- `packages/core/test/amounts.test.mjs`, 8 checks including the exact 1000x
  factor against the arithmetic that was deleted.
- `packages/plugin-identity/test/message-bodies.test.mjs`, 5 checks: each
  message body round-trips through the generated parser, the Rate opcode
  equals the value in the ABI header map, and no source file writes an opcode
  by hand.
- `packages/strategies/test/scheduler.test.mjs`, 9 checks covering the timer
  limit, the overlap guard, and a cross-check that every action a shipped
  template calls is registered by one of the twelve plugins.
- Four checks in `packages/x402-middleware/test/verification.test.mjs`. One
  drives the real middleware over a stubbed transaction six times and asserts
  exactly three responses, then three 402s.
- `packages/orchestrator/test/dispatcher.test.mjs`, 4 checks. They race
  `dispatch` against a five second deadline, so a regression hangs the check
  rather than the machine.
- `packages/core/test/methods-proxy.test.mjs`, 5 checks, and
  `packages/core/test/context-run-action.test.mjs`, 3, one of which answered
  `{ reachable: false }` before the context carried `runAction`.
- `packages/wallet-store/test/file-store.test.mjs`, 7 checks. The first deletes
  a blob out from under a live row and asserts the row still goes and the quota
  comes back to zero.
- CI runs all of these: 95 checks across twelve files, including the two
  contract sandbox suites added after this entry was first written. The Bun job installs
  dependencies and covers `wallet-store`, `plugin-identity` and the two core
  suites that need it; the Node 22 job covers `core`, `x402-middleware`,
  `strategies` and `orchestrator`.

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
3. **14 of the 21 packages have no `test` script**, which is honest: no package
   declares a runner it does not have, and the `"test": "jest"` entries with no
   jest configuration are gone. `core`, `x402-middleware`, `strategies`,
   `orchestrator`, `wallet-store`, `plugin-identity` and `plugin-agent-comm`
   run real checks through `npm test`, all of them in CI, alongside
   `npm run test:contracts`. The `tests/` tree is separate: `tests.ts` at the
   repository root is an interactive runner covering 28 suites, and 27 of them
   need a funded testnet wallet, so none of those run in CI.
4. **The escrow contract has three proven defects.** `contracts/escrow.tact`
   and `contracts/reputation.tact` now run under `@ton/sandbox` in CI, 27
   checks between them, and the escrow suite names three of its checks
   `KNOWN DEFECT`: a buyer can refund itself after confirming delivery, a
   dispute cannot seat a quorum and confiscates roughly every other stake, and
   no vote can therefore be held. All three need a redeployment, and the
   testnet address is hardcoded in the published SDK. reputation.tact came
   through the same treatment with nothing found.
5. **`any` still exists outside the files this release touched**: 23 occurrences
   in `core/src/agent.ts`, 11 in `wallet-store`, 11 in
   `plugin-identity/src/reputation-helpers.ts`, and the generated Tact
   bindings.

## Earlier history

Releases before 1.1.0 were published to npm without a changelog entry. Package
versions and their publication dates are visible on npm under the
[@ton-agent-kit](https://www.npmjs.com/org/ton-agent-kit) scope.
