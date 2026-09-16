# Contracts

Two Tact contracts, both holding user funds.

| File | Lines | What it holds |
|---|---|---|
| `escrow.tact` | 524 | One deal: the deposit, the seller stake, and every arbiter stake |
| `reputation.tact` | 838 | The agent registry, the scores, the intent and offer marketplace, and the accumulated fees |

## Running them

`npm run test:contracts` drives the real compiled contracts in `@ton/sandbox`,
in process. No network, no wallet, no faucet, a few seconds.

```bash
npm run test:contracts
```

Twenty-seven checks across `test/escrow.sandbox.test.mjs` and
`test/reputation.sandbox.test.mjs`. CI runs them on every push.

Three of the escrow checks are named `KNOWN DEFECT`. They assert what the
deployed contract does today, which is not what it should do. Fixing the
contract makes them fail, and that is deliberate: it is the signal to rewrite
the check as a real assertion. The three are described in `CHANGELOG.md`.

## Rebuilding the bindings

Nothing regenerates these automatically. The compiler is pinned as a root
dependency and `tact.config.json` writes into `output/`:

```bash
npx tact --config contracts/tact.config.json
```

**The generated `.ts` bindings that packages publish live under
`packages/plugin-escrow/src/contracts/` and
`packages/plugin-identity/src/contracts/`, not here.** A second copy used to be
committed in `output/`, byte for byte identical, and both were tracked, so a
rebuild could update one and leave the other in place. After a rebuild, copy the
two files across by hand:

```bash
cp contracts/output/Escrow_Escrow.ts packages/plugin-escrow/src/contracts/
cp contracts/output/Reputation_Reputation.ts packages/plugin-identity/src/contracts/
```

`output/*.ts`, `output/*.fc` and `output/*.fif` are gitignored: the first
because the authoritative copy is in the packages, the other two because they
are compiler intermediates that nothing in this repository reads. The `.abi`,
`.pkg`, `.md` and `.code.boc` files stay committed, because they are what a
third party needs to verify the deployed code.

## Deploying

```bash
bun contracts/deploy-reputation.ts
bun contracts/deploy-escrow.ts
```

The reputation contract goes first: the escrow script requires
`REPUTATION_CONTRACT_ADDRESS` and refuses to deploy without it, because an
escrow with no reputation contract cannot notify anyone that a dispute opened.

Both need `TON_MNEMONIC` in `.env`, and read `TON_NETWORK` and `TON_RPC_URL`.
The deploying wallet becomes the reputation contract's owner, which is the only
address that can withdraw fees or register an escrow.

`npm run typecheck:contracts` checks both scripts. They were covered by no
tsconfig until 2026-09-16 and had drifted seven type errors out of date, which
is why that command now runs in CI.

## The deployed testnet instance

`0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9`

sourceRef: `packages/plugin-identity/src/reputation-config.ts`. It is hardcoded
in the published SDK, so redeploying the reputation contract means releasing a
new version of `@ton-agent-kit/plugin-identity`.
