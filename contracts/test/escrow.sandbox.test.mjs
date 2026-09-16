// The first executable coverage contracts/escrow.tact has ever had.
//
// Until now the only things that ran against it were tests/10-escrow-onchain.ts
// and tests/18-escrow-advanced.ts, both of which need a funded testnet wallet
// and therefore never run in CI. Everything anyone believed about the dispute
// and settlement paths came from reading the source.
//
// @ton/sandbox runs the real compiled contract in-process: no network, no
// wallet, no faucet. The compiled code travels inside the generated wrapper,
// so nothing here reads contracts/output.
//
//   bun contracts/test/escrow.sandbox.test.mjs

import assert from "node:assert/strict";
import { Blockchain } from "@ton/sandbox";
import { toNano } from "@ton/core";
import { Escrow } from "../../packages/plugin-escrow/src/contracts/Escrow_Escrow.ts";

/** Gas attached to a message that is not itself carrying value. */
const GAS = toNano("0.15");

/** How far ahead a deal deadline is set, in seconds. */
const DEADLINE_HORIZON_SECONDS = 3600;

/** What each arbiter stakes in these scenarios, above the 0.5 TON minimum. */
const ARBITER_STAKE = toNano("0.6");

let failures = 0;
let total = 0;
async function check(name, run) {
  total++;
  try {
    await run();
    console.log(`  pass  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

/** Every transaction the escrow itself processed, in order. */
function transactionsAt(result, address) {
  return result.transactions.filter((transaction) => {
    const destination = transaction.inMessage?.info?.dest;
    return typeof destination?.equals === "function" && destination.equals(address);
  });
}

/**
 * How the escrow handled a message.
 *
 * Both phases matter and they fail differently. A failed compute phase is the
 * contract saying no through require(). A failed action phase is the contract
 * accepting the message, keeping whatever value arrived with it, and then
 * being unable to carry out the sends it asked for: the state change rolls
 * back, the money does not come back.
 */
function outcomeAt(result, address) {
  const [transaction] = transactionsAt(result, address);
  if (!transaction) return { reached: false };
  const compute = transaction.description?.computePhase;
  const action = transaction.description?.actionPhase;
  return {
    reached: true,
    computeSucceeded: compute?.success === true,
    computeExitCode: compute?.exitCode,
    actionSucceeded: action?.success ?? true,
    actionResultCode: action?.resultCode ?? 0,
  };
}

/** Did the escrow accept the message and carry out its sends? */
function succeededAt(result, address) {
  const outcome = outcomeAt(result, address);
  return outcome.reached && outcome.computeSucceeded && outcome.actionSucceeded;
}

/** Did the escrow refuse the message in its compute phase, through require()? */
function rejectionAt(result, address) {
  const outcome = outcomeAt(result, address);
  return outcome.reached && !outcome.computeSucceeded ? outcome : null;
}

/** A funded escrow with the given cast, ready for the settlement paths. */
async function openDeal({ minArbiters = 3n, amount = "1" } = {}) {
  const blockchain = await Blockchain.create();
  const depositor = await blockchain.treasury("depositor");
  const beneficiary = await blockchain.treasury("beneficiary");
  const reputation = await blockchain.treasury("reputation");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  const escrow = blockchain.openContract(
    await Escrow.fromInit(
      depositor.address,
      beneficiary.address,
      deadline,
      minArbiters,
      toNano("0.5"),
      reputation.address,
      false,
      0n,
      0n,
    ),
  );

  await escrow.send(depositor.getSender(), { value: toNano("0.2") }, { $$type: "Deploy", queryId: 0n });
  await escrow.send(depositor.getSender(), { value: toNano(amount) }, { $$type: "Deposit", queryId: 0n });

  return { blockchain, escrow, depositor, beneficiary, reputation, deadline };
}

/** Open a dispute and try to seat `names.length` arbiters. */
async function seatArbiters(blockchain, escrow, depositor, names) {
  await escrow.send(depositor.getSender(), { value: toNano("0.15") }, { $$type: "OpenDispute", queryId: 0n });
  const seated = [];
  const outcomes = [];
  for (const name of names) {
    const arbiter = await blockchain.treasury(name);
    seated.push(arbiter);
    const result = await escrow.send(arbiter.getSender(), { value: ARBITER_STAKE }, { $$type: "JoinDispute", queryId: 0n });
    outcomes.push(outcomeAt(result, escrow.address));
  }
  return { seated, outcomes };
}

console.log("contracts/escrow.tact, in the sandbox");

await check("a deposit is credited and the deal reports it", async () => {
  const { escrow } = await openDeal();
  const data = await escrow.getEscrowData();
  assert.equal(data.amount, toNano("1"), `amount was ${data.amount}`);
  assert.equal(data.released, false);
  assert.equal(data.refunded, false);
});

await check("the depositor can release, and the beneficiary is paid", async () => {
  const { escrow, depositor, beneficiary } = await openDeal();
  const before = await beneficiary.getBalance();

  const result = await escrow.send(depositor.getSender(), { value: GAS }, { $$type: "Release", queryId: 0n });
  assert.ok(succeededAt(result, escrow.address), "the escrow refused a valid release");

  assert.equal((await escrow.getEscrowData()).released, true);
  const gained = (await beneficiary.getBalance()) - before;
  assert.ok(gained > toNano("0.9"), `the beneficiary gained only ${gained} nanoton`);
});

await check("only the depositor can release", async () => {
  const { escrow, beneficiary } = await openDeal();
  const result = await escrow.send(beneficiary.getSender(), { value: GAS }, { $$type: "Release", queryId: 0n });
  assert.ok(rejectionAt(result, escrow.address), "the beneficiary released the deal to itself");
  assert.equal((await escrow.getEscrowData()).released, false);
});

// KNOWN DEFECT, and the worst one this harness found.
//
// A buyer can confirm delivery, which is what tells the seller the goods were
// accepted, and then refund itself the whole deal at any point before the
// deadline. escrow.tact does carry a guard for this, at line 226:
//
//   if (now() < self.deadline) {
//       require(sender() == self.depositor, "Only depositor can refund before deadline");
//   } else if (!self.deliveryConfirmed) {
//       // After deadline, no delivery: anyone can trigger
//   } else {
//       require(false, "Delivery confirmed, open a dispute to contest");
//   }
//
// but it sits in the branch that is only reachable AFTER the deadline. Before
// it, the first branch runs and checks nothing but the sender. Reading the
// guard is what convinced an earlier pass, and this author, that the hole was
// closed. Running it shows the buyer recovering the full amount and the seller
// receiving nothing.
//
// The fix is an ordering change in the contract: refuse a confirmed delivery
// before branching on the deadline. That is a redeployment, and the testnet
// address is hardcoded in the published SDK, so it is the repository owner's
// decision. When it is fixed this check fails, which is the point.
await check("KNOWN DEFECT: the buyer can refund itself after confirming delivery", async () => {
  const { escrow, depositor, beneficiary } = await openDeal();
  await escrow.send(depositor.getSender(), { value: GAS }, { $$type: "DeliveryConfirmed", x402TxHash: "" });
  assert.equal((await escrow.getEscrowData()).deliveryConfirmed, true);

  const depositorBefore = await depositor.getBalance();
  const beneficiaryBefore = await beneficiary.getBalance();
  const result = await escrow.send(depositor.getSender(), { value: GAS }, { $$type: "Refund", queryId: 0n });

  const recovered = (await depositor.getBalance()) - depositorBefore;
  const paidToSeller = (await beneficiary.getBalance()) - beneficiaryBefore;
  console.log(
    `        buyer confirmed delivery, then refunded: recovered ${recovered} nanoton, ` +
      `seller received ${paidToSeller}`,
  );

  assert.ok(succeededAt(result, escrow.address), "the refund was refused, so the defect may be fixed");
  assert.equal((await escrow.getEscrowData()).refunded, true, "the refund did not settle, so this check needs rewriting");
  assert.equal(paidToSeller, 0n, "the seller was paid, so this check needs rewriting");
  assert.ok(recovered > toNano("0.9"), `the buyer only recovered ${recovered} nanoton`);
});

await check("a refund before the deadline is the depositor's alone", async () => {
  const { escrow, depositor, beneficiary } = await openDeal();

  const byBeneficiary = await escrow.send(beneficiary.getSender(), { value: GAS }, { $$type: "Refund", queryId: 0n });
  assert.ok(rejectionAt(byBeneficiary, escrow.address), "the beneficiary refunded the depositor");

  const byDepositor = await escrow.send(depositor.getSender(), { value: GAS }, { $$type: "Refund", queryId: 0n });
  assert.ok(succeededAt(byDepositor, escrow.address), "the depositor could not refund before the deadline");
  assert.equal((await escrow.getEscrowData()).refunded, true);
});

// KNOWN DEFECT, characterised here rather than asserted away.
//
// An earlier pass suspected from reading the source that only one arbiter can
// ever join. Running it shows something sharper. JoinDispute ends with
// nativeReserve(amount + stakes + storageFund + 0.01, 0) and then sweeps the
// remainder back to the sender, which leaves the balance sitting exactly on
// the reserve. The next arbiter message therefore cannot cover both its own
// gas and the new reserve, so its action phase fails with code 37: the
// registration rolls back and the stake that arrived stays in the contract
// with no record of who sent it.
//
// The stake kept by each failed join is what funds the one after it, so joins
// succeed roughly every other attempt and the rest are silently confiscated.
//
// This locks in what the deployed contract does today. Fixing it means a
// redeployment, and the testnet address is hardcoded in the published SDK, so
// it is the repository owner's decision. When it is fixed this check fails,
// which is the point.
await check("KNOWN DEFECT: a dispute cannot seat a quorum, and stakes are confiscated", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  const { outcomes } = await seatArbiters(blockchain, escrow, depositor, ["arbiter-a", "arbiter-b", "arbiter-c"]);

  const registered = (await escrow.getEscrowData()).arbiterCount;
  const confiscated = outcomes.filter((outcome) => outcome.computeSucceeded && !outcome.actionSucceeded);

  console.log(
    `        three arbiters staked 0.6 TON each: ${registered} registered, ` +
      `${confiscated.length} lost the stake to action-phase code ` +
      `${confiscated.map((outcome) => outcome.actionResultCode).join("/")}`,
  );

  // Every attempt passes require(): the contract believes it accepted them.
  for (const outcome of outcomes) {
    assert.equal(outcome.computeSucceeded, true, "a join was refused by require(), which is not this defect");
  }
  assert.ok(confiscated.length > 0, "no join lost its stake, so the defect may be fixed");
  assert.ok(registered < 3n, `${registered} arbiters registered, so this check needs rewriting`);
});

await check("the deal's own funds survive arbiters joining", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  await seatArbiters(blockchain, escrow, depositor, ["join-a", "join-b", "join-c"]);

  const data = await escrow.getEscrowData();
  assert.equal(data.amount, toNano("1"), "the deal amount changed while arbiters joined");
  const balance = await escrow.getBalance();
  assert.ok(balance >= data.amount, `balance ${balance} fell below the deal amount ${data.amount}`);
});

// Follows from the defect above: with fewer arbiters registered than
// minArbiters, VoteRelease stops at require(arbiterCount >= minArbiters).
// Every dispute therefore ends in FallbackSettle, which the depositor
// controls, and the arbiter network never decides anything.
await check("KNOWN DEFECT: a vote cannot be held, because the quorum is unreachable", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  const { seated } = await seatArbiters(blockchain, escrow, depositor, ["v1", "v2", "v3"]);

  const outcomes = [];
  for (const voter of seated) {
    const result = await escrow.send(voter.getSender(), { value: GAS }, { $$type: "VoteRelease", queryId: 0n });
    outcomes.push(outcomeAt(result, escrow.address));
  }
  const refused = outcomes.filter((outcome) => !outcome.computeSucceeded);

  console.log(
    `        ${refused.length} of ${outcomes.length} votes were refused outright, exit code ` +
      `${[...new Set(refused.map((outcome) => outcome.computeExitCode))].join("/")}`,
  );

  assert.ok(refused.length > 0, "every vote was accepted, so the quorum defect may be fixed");
  assert.equal((await escrow.getEscrowData()).released, false, "the deal settled, so this check needs rewriting");
});

// Whether a losing arbiter forfeits the stake is the question the arbiter
// economics rest on, and it cannot be answered while no deal reaches a vote.
// Recorded so that fixing the quorum turns this into a real check.
await check("KNOWN DEFECT: slashing cannot be exercised while the quorum is unreachable", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  const { seated } = await seatArbiters(blockchain, escrow, depositor, ["w1", "loser", "w2"]);

  await escrow.send(seated[0].getSender(), { value: GAS }, { $$type: "VoteRelease", queryId: 0n });
  await escrow.send(seated[1].getSender(), { value: GAS }, { $$type: "VoteRefund", queryId: 0n });
  await escrow.send(seated[2].getSender(), { value: GAS }, { $$type: "VoteRelease", queryId: 0n });

  const data = await escrow.getEscrowData();
  console.log(
    `        after three votes: released=${data.released} refunded=${data.refunded} ` +
      `arbiterCount=${data.arbiterCount} votesRelease=${data.votesRelease} votesRefund=${data.votesRefund}`,
  );
  assert.equal(data.released, false, "the deal settled, so slashing can now be tested properly");
});

await check("an arbiter who never voted cannot claim", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  const { seated } = await seatArbiters(blockchain, escrow, depositor, ["s1", "s2", "silent"]);

  const result = await escrow.send(seated[2].getSender(), { value: GAS }, { $$type: "ClaimReward", queryId: 0n });
  assert.ok(rejectionAt(result, escrow.address), "an arbiter who never voted was paid");
});

await check("an unsettled deal pays no arbiter reward", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  const { seated } = await seatArbiters(blockchain, escrow, depositor, ["early-claimer"]);

  const result = await escrow.send(seated[0].getSender(), { value: GAS }, { $$type: "ClaimReward", queryId: 0n });
  assert.ok(rejectionAt(result, escrow.address), "a reward was paid before the deal settled");
});

await check("a stranger cannot become an arbiter without the minimum stake", async () => {
  const { blockchain, escrow, depositor } = await openDeal({ minArbiters: 2n });
  await escrow.send(depositor.getSender(), { value: toNano("0.15") }, { $$type: "OpenDispute", queryId: 0n });

  const cheap = await blockchain.treasury("cheap");
  const result = await escrow.send(cheap.getSender(), { value: toNano("0.1") }, { $$type: "JoinDispute", queryId: 0n });
  assert.ok(rejectionAt(result, escrow.address), "an under-staked arbiter joined");
  assert.equal((await escrow.getEscrowData()).arbiterCount, 0n);
});

await check("neither party to the deal can arbitrate it", async () => {
  const { escrow, depositor, beneficiary } = await openDeal({ minArbiters: 2n });
  await escrow.send(depositor.getSender(), { value: toNano("0.15") }, { $$type: "OpenDispute", queryId: 0n });

  for (const party of [depositor, beneficiary]) {
    const result = await escrow.send(party.getSender(), { value: ARBITER_STAKE }, { $$type: "JoinDispute", queryId: 0n });
    assert.ok(rejectionAt(result, escrow.address), "a party to the deal joined its own dispute");
  }
  assert.equal((await escrow.getEscrowData()).arbiterCount, 0n);
});

await check("releasing a disputed deal outside the vote is refused", async () => {
  const { escrow, depositor } = await openDeal({ minArbiters: 2n });
  await escrow.send(depositor.getSender(), { value: toNano("0.15") }, { $$type: "OpenDispute", queryId: 0n });

  const result = await escrow.send(depositor.getSender(), { value: GAS }, { $$type: "Release", queryId: 0n });
  assert.ok(rejectionAt(result, escrow.address), "a disputed deal was released without a vote");
  assert.equal((await escrow.getEscrowData()).released, false);
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);
