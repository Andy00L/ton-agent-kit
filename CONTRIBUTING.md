# Contributing to TON Agent Kit

Thanks for taking the time. This is a monorepo of 21 packages published to npm
under the `@ton-agent-kit` scope. The sections below cover setup, the layout,
and what a pull request needs before it can be merged.

## Setup

Requirements: Node.js 18 or later (CI runs 20 and 22) and npm 9 or later.

```bash
git clone https://github.com/Andy00L/ton-agent-kit.git
cd ton-agent-kit
npm install
npm run build
```

`npm run build` typechecks and compiles every package. It must stay green: CI
runs it on Node 20 and Node 22, and a pull request that turns it red is not
mergeable. Open issues that are known and deliberately unfixed are listed under
Known issues in [CHANGELOG.md](./CHANGELOG.md).

## Repository layout

```
packages/        21 published packages, one folder per npm package
  core/          agent class, plugin system, wallet abstraction
  plugin-*/      one plugin per domain (token, defi, nft, escrow, identity, ...)
  mcp-server/    MCP server exposing the actions to AI clients
  orchestrator/  multi-agent execution
examples/        runnable examples, not published
contracts/       Tact smart contracts (escrow, reputation)
tests/           numbered integration scripts, run individually
docs/            long-form documentation
```

Packages expose `src/index.ts` as their `main` and `types`, so consumers compile
the TypeScript source in their own project. That means a type error in this
repository becomes a type error in theirs. Keep the public surface typed.

## Adding an action to a plugin

1. Create `packages/plugin-<domain>/src/actions/<verb>-<noun>.ts`.
2. Define the input with a zod schema. Every field gets a `.describe()` string:
   the MCP server and the LangChain adapter turn those into tool descriptions.
3. Export the action from the plugin's `src/index.ts`.
4. Add a numbered script under `tests/` that exercises it against testnet.
5. Update the action table in `README.md` and the package `README` if it has one.

## Pull requests

- One concern per pull request. A dependency bump and a new action do not
  travel together.
- Conventional commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`,
  `test:`.
- Describe what you ran. `npm run build` must pass. On-chain behaviour is not
  covered by CI, so a change to a transfer, an escrow or a payment path needs a
  testnet transaction hash in the pull request body.
- No `any`, no `@ts-ignore`, no `as unknown as`. If a type does not fit, fix the
  type.
- Do not commit `.env`, private keys, seed phrases or mnemonics. The repository
  ignores `.env`, and the CI secret scan will fail a pull request that adds one.

## Versioning and releases

Each package carries its own semantic version. The repository tag tracks the
snapshot, not any one package. Only the maintainer publishes to npm.

- Patch: a fix with no signature change.
- Minor: a new action, a new plugin, a new optional parameter.
- Major: a changed or removed export, or a changed on-chain call.

Every user-visible change gets a `CHANGELOG.md` entry in the same pull request.

## Reporting a bug

Open an issue with the template. For anything that touches funds, keys or the
payment middleware, read [SECURITY.md](./SECURITY.md) first and report it
privately instead.
