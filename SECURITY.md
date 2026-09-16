# Security Policy

TON Agent Kit signs transactions, holds wallet material through
`@ton-agent-kit/wallet-store`, and settles payments through
`@ton-agent-kit/x402-middleware` and the escrow contracts. A bug in any of those
paths can move funds. Please report those privately.

## Supported versions

The latest published version of each package under the `@ton-agent-kit` scope
receives security fixes. Older versions do not. Versions are listed on
[npm](https://www.npmjs.com/org/ton-agent-kit).

## Reporting a vulnerability

Do not open a public issue.

1. Preferred: GitHub private vulnerability reporting, from the Security tab of
   this repository.
2. Alternative: email andy.luemba@protonmail.com with `SECURITY` in the subject.

Please include the affected package and version, what an attacker gains, a
reproduction (a script or a testnet transaction hash), and any suggested fix.

Expect an acknowledgement within 72 hours and an assessment within 7 days. This
project is maintained by one person, so a fix for a confirmed issue lands as fast
as the change can be tested, and the report stays private until the fixed version
is on npm. There is no bounty.

## Scope

In scope:

- Key or mnemonic material leaking through logs, errors, storage or serialization
- Wallet address derivation producing an address the caller did not intend
- Escrow or payment state transitions that release funds to the wrong party
- x402 replay, signature reuse, or payment verification bypass
- Reputation or identity records that can be forged on-chain
- Dependency vulnerabilities that are reachable from a published entry point

Out of scope:

- Vulnerabilities in TON itself, in a node, or in a third-party RPC provider
- Attacks that require the victim to run code you supply, or to paste a private
  key into an untrusted process
- Rate limits and availability of public RPC endpoints
- The known advisories listed in [CHANGELOG.md](./CHANGELOG.md), which are
  tracked already

## Handling keys

If you run this library: keep mnemonics in environment variables or in an
encrypted `wallet-store`, never in source. Use a dedicated wallet for agent
operation, funded with the amount that agent is allowed to spend. Test against
testnet before mainnet.
