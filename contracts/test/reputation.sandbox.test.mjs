// The first executable coverage contracts/reputation.tact has ever had.
//
// This is the contract the whole agent commerce protocol runs on: the agent
// registry, the reputation scores, and the intent / offer / deal marketplace.
// Nothing that runs in CI had ever sent it a message. It also holds fees, so
// the withdraw path matters.
//
// The end-to-end run below is what finally exercises Rate against a real deal.
// Until the 2026-09-16 audit the SDK built that message from a hand-copied
// opcode that no receiver answers, so no rating ever landed on chain.
//
//   bun contracts/test/reputation.sandbox.test.mjs

import assert from "node:assert/strict";
import { Blockchain } from "@ton/sandbox";
import { toNano } from "@ton/core";
import { Reputation } from "../../packages/plugin-identity/src/contracts/Reputation_Reputation.ts";

/** The contract refuses anything under this. sourceRef: reputation.tact:124 */
const FEE = toNano("0.01");

/** Comfortable gas for a message that carries no value of its own. */
const GAS = toNano("0.12");

/** How far ahead an intent deadline is set, in seconds. */
const DEADLINE_HORIZON_SECONDS = 3600;

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

/** How the contract handled a message: both phases, reported separately. */
function outcomeAt(result, address) {
  const [transaction] = result.transactions.filter((candidate) => {
    const destination = candidate.inMessage?.info?.dest;
    return typeof destination?.equals === "function" && destination.equals(address);
  });
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

const succeededAt = (result, address) => {
  const outcome = outcomeAt(result, address);
  return outcome.reached && outcome.computeSucceeded && outcome.actionSucceeded;
};

const rejectionAt = (result, address) => {
  const outcome = outcomeAt(result, address);
  return outcome.reached && !outcome.computeSucceeded ? outcome : null;
};

/** A deployed registry with an owner and two agents standing by. */
async function openRegistry() {
  const blockchain = await Blockchain.create();
  const owner = await blockchain.treasury("owner");
  const buyer = await blockchain.treasury("buyer");
  const seller = await blockchain.treasury("seller");
  const stranger = await blockchain.treasury("stranger");

  const registry = blockchain.openContract(await Reputation.fromInit(owner.address));
  await registry.send(owner.getSender(), { value: toNano("0.5") }, { $$type: "Deploy", queryId: 0n });

  return { blockchain, registry, owner, buyer, seller, stranger };
}

const register = (registry, sender, name, capabilities = "compute") =>
  registry.send(
    sender.getSender(),
    { value: toNano("0.05") },
    { $$type: "Register", name, capabilities, available: true },
  );

console.log("contracts/reputation.tact, in the sandbox");

await check("an agent can register, and the registry counts it", async () => {
  const { registry, seller } = await openRegistry();
  const result = await register(registry, seller, "price-oracle");
  assert.ok(succeededAt(result, registry.address), "a valid registration was refused");
  assert.equal(await registry.getAgentCount(), 1n);
});

await check("a registration under the fee is refused", async () => {
  const { registry, seller } = await openRegistry();
  const result = await registry.send(
    seller.getSender(),
    { value: FEE - 1n },
    { $$type: "Register", name: "too-cheap", capabilities: "compute", available: true },
  );
  assert.ok(rejectionAt(result, registry.address), "the registry accepted less than its own fee");
  assert.equal(await registry.getAgentCount(), 0n);
});

await check("only the owner of a name can change its availability", async () => {
  const { registry, seller, stranger } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const byStranger = await registry.send(
    stranger.getSender(),
    { value: GAS },
    { $$type: "UpdateAvailability", name: "price-oracle", available: false },
  );
  assert.ok(rejectionAt(byStranger, registry.address), "a stranger flipped someone else's availability");

  const byOwner = await registry.send(
    seller.getSender(),
    { value: GAS },
    { $$type: "UpdateAvailability", name: "price-oracle", available: false },
  );
  assert.ok(succeededAt(byOwner, registry.address), "the agent owner could not change its own availability");
});

await check("a rating with no deal behind it is refused", async () => {
  const { registry, buyer, seller } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const result = await registry.send(
    buyer.getSender(),
    { value: toNano("0.05") },
    { $$type: "Rate", agentName: "price-oracle", success: true, dealIndex: 0n },
  );
  assert.ok(rejectionAt(result, registry.address), "a score was recorded without a deal");
});

// The whole point of the contract, run once from end to end. Until the opcode
// fix in this release, the SDK's Rate message reached no receiver at all, so
// this path had never completed anywhere.
await check("a full deal runs from intent to settled rating", async () => {
  const { registry, buyer, seller } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  const broadcast = await registry.send(
    buyer.getSender(),
    { value: toNano("0.12") },
    {
      $$type: "BroadcastIntent",
      serviceHash: 1234n,
      serviceName: "price-feed",
      budget: toNano("5"),
      deadline,
      description: "one TON price quote",
    },
  );
  assert.ok(succeededAt(broadcast, registry.address), "the intent was refused");
  assert.equal(await registry.getIntentCount(), 1n);

  const offer = await registry.send(
    seller.getSender(),
    { value: toNano("0.12") },
    {
      $$type: "SendOffer",
      intentIndex: 0n,
      price: toNano("3"),
      deliveryTime: 600n,
      endpoint: "https://oracle.example/price",
    },
  );
  assert.ok(succeededAt(offer, registry.address), "the offer was refused");
  assert.equal(await registry.getOfferCount(), 1n);

  const accept = await registry.send(
    buyer.getSender(),
    { value: toNano("0.12") },
    { $$type: "AcceptOffer", offerIndex: 0n },
  );
  assert.ok(succeededAt(accept, registry.address), "the buyer could not accept the offer");

  const settle = await registry.send(
    buyer.getSender(),
    { value: toNano("0.12") },
    { $$type: "SettleDeal", intentIndex: 0n, rating: 90n },
  );
  assert.ok(succeededAt(settle, registry.address), "the deal could not be settled");

  const rate = await registry.send(
    buyer.getSender(),
    { value: toNano("0.05") },
    { $$type: "Rate", agentName: "price-oracle", success: true, dealIndex: 0n },
  );
  assert.ok(succeededAt(rate, registry.address), "the rating the settled deal authorises was refused");

  const reputation = await registry.getAgentReputation(0n);
  console.log(`        after one successful deal: ${JSON.stringify(reputation, (_key, value) => typeof value === "bigint" ? value.toString() : value)}`);
  assert.ok(reputation, "the agent has no reputation record after being rated");
});

await check("the same deal cannot be rated twice", async () => {
  const { registry, buyer, seller } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 1n, serviceName: "s", budget: toNano("5"), deadline, description: "d",
  });
  await registry.send(seller.getSender(), { value: toNano("0.12") }, {
    $$type: "SendOffer", intentIndex: 0n, price: toNano("1"), deliveryTime: 60n, endpoint: "e",
  });
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, { $$type: "AcceptOffer", offerIndex: 0n });
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, { $$type: "SettleDeal", intentIndex: 0n, rating: 90n });

  const first = await registry.send(buyer.getSender(), { value: toNano("0.05") }, {
    $$type: "Rate", agentName: "price-oracle", success: true, dealIndex: 0n,
  });
  assert.ok(succeededAt(first, registry.address), "the first rating was refused");

  const second = await registry.send(buyer.getSender(), { value: toNano("0.05") }, {
    $$type: "Rate", agentName: "price-oracle", success: true, dealIndex: 0n,
  });
  assert.ok(rejectionAt(second, registry.address), "the same deal was rated twice");
});

await check("nobody can bid on their own intent", async () => {
  const { registry, buyer } = await openRegistry();
  await register(registry, buyer, "self-dealer");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 7n, serviceName: "s", budget: toNano("5"), deadline, description: "d",
  });

  const result = await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "SendOffer", intentIndex: 0n, price: toNano("1"), deliveryTime: 60n, endpoint: "e",
  });
  assert.ok(rejectionAt(result, registry.address), "an agent bid on its own intent and could have rated itself");
});

await check("an offer above the stated budget is refused", async () => {
  const { registry, buyer, seller } = await openRegistry();
  await register(registry, seller, "expensive");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 9n, serviceName: "s", budget: toNano("1"), deadline, description: "d",
  });

  const result = await registry.send(seller.getSender(), { value: toNano("0.12") }, {
    $$type: "SendOffer", intentIndex: 0n, price: toNano("2"), deliveryTime: 60n, endpoint: "e",
  });
  assert.ok(rejectionAt(result, registry.address), "an over-budget offer was accepted");
});

await check("an intent whose deadline has passed is refused", async () => {
  const { registry, buyer } = await openRegistry();
  const past = BigInt(Math.floor(Date.now() / 1000) - 60);
  const result = await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 3n, serviceName: "s", budget: toNano("1"), deadline: past, description: "d",
  });
  assert.ok(rejectionAt(result, registry.address), "an intent was opened in the past");
  assert.equal(await registry.getIntentCount(), 0n);
});

await check("only the intent owner can accept an offer or settle the deal", async () => {
  const { registry, buyer, seller, stranger } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 5n, serviceName: "s", budget: toNano("5"), deadline, description: "d",
  });
  await registry.send(seller.getSender(), { value: toNano("0.12") }, {
    $$type: "SendOffer", intentIndex: 0n, price: toNano("1"), deliveryTime: 60n, endpoint: "e",
  });

  const byStranger = await registry.send(stranger.getSender(), { value: toNano("0.12") }, {
    $$type: "AcceptOffer", offerIndex: 0n,
  });
  assert.ok(rejectionAt(byStranger, registry.address), "a stranger accepted someone else's offer");

  await registry.send(buyer.getSender(), { value: toNano("0.12") }, { $$type: "AcceptOffer", offerIndex: 0n });
  const settleByStranger = await registry.send(stranger.getSender(), { value: toNano("0.12") }, {
    $$type: "SettleDeal", intentIndex: 0n, rating: 90n,
  });
  assert.ok(rejectionAt(settleByStranger, registry.address), "a stranger settled someone else's deal");
});

await check("only the intent owner can cancel it", async () => {
  const { registry, buyer, stranger } = await openRegistry();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  await registry.send(buyer.getSender(), { value: toNano("0.12") }, {
    $$type: "BroadcastIntent", serviceHash: 11n, serviceName: "s", budget: toNano("1"), deadline, description: "d",
  });

  const byStranger = await registry.send(stranger.getSender(), { value: GAS }, { $$type: "CancelIntent", intentIndex: 0n });
  assert.ok(rejectionAt(byStranger, registry.address), "a stranger cancelled someone else's intent");

  const byOwner = await registry.send(buyer.getSender(), { value: GAS }, { $$type: "CancelIntent", intentIndex: 0n });
  assert.ok(succeededAt(byOwner, registry.address), "the intent owner could not cancel it");
});

await check("only the contract owner can withdraw fees or register an escrow", async () => {
  const { registry, owner, seller, stranger } = await openRegistry();
  await register(registry, seller, "price-oracle");

  const withdrawByStranger = await registry.send(stranger.getSender(), { value: GAS }, { $$type: "Withdraw" });
  assert.ok(rejectionAt(withdrawByStranger, registry.address), "a stranger withdrew the accumulated fees");

  const escrowByStranger = await registry.send(stranger.getSender(), { value: GAS }, {
    $$type: "RegisterEscrow", escrowAddress: stranger.address,
  });
  assert.ok(rejectionAt(escrowByStranger, registry.address), "a stranger registered an escrow contract");

  const escrowByOwner = await registry.send(owner.getSender(), { value: GAS }, {
    $$type: "RegisterEscrow", escrowAddress: stranger.address,
  });
  assert.ok(succeededAt(escrowByOwner, registry.address), "the owner could not register an escrow");
});

await check("a dispute notice from an unregistered escrow is refused", async () => {
  const { registry, stranger } = await openRegistry();
  const result = await registry.send(stranger.getSender(), { value: GAS }, {
    $$type: "NotifyDisputeOpened",
    escrowAddress: stranger.address,
    depositor: stranger.address,
    beneficiary: stranger.address,
    amount: toNano("1"),
    votingDeadline: BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS),
  });
  assert.ok(rejectionAt(result, registry.address), "an unknown contract opened a dispute in the registry");
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);
