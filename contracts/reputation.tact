import "@stdlib/deploy";

// ── Agent Messages ──
message Register { name: String; capabilities: String; available: Bool; }
message Rate { agentName: String; success: Bool; }
message UpdateAvailability { name: String; available: Bool; }
message Withdraw {}
message IndexCapability { agentIndex: Int as uint32; capabilityHash: Int as uint256; }
message TriggerCleanup { maxClean: Int as uint8; }

// ── Cross-contract ──
message NotifyDisputeOpened { escrowAddress: Address; depositor: Address; beneficiary: Address; amount: Int as coins; votingDeadline: Int as uint32; }
message NotifyDisputeSettled { escrowAddress: Address; released: Bool; refunded: Bool; }

// ── Intent/Offer Messages ──
message BroadcastIntent { serviceHash: Int as uint256; budget: Int as coins; deadline: Int as uint32; }
message SendOffer { intentIndex: Int as uint32; price: Int as coins; deliveryTime: Int as uint32; }
message AcceptOffer { offerIndex: Int as uint32; }
message CancelIntent { intentIndex: Int as uint32; }
message SettleDeal { intentIndex: Int as uint32; rating: Int as uint8; }

// ── Structs ──
struct AgentData { owner: Address; available: Bool; totalTasks: Int as uint32; successes: Int as uint32; registeredAt: Int as uint32; }
struct DisputeInfo { escrowAddress: Address; depositor: Address; beneficiary: Address; amount: Int as coins; votingDeadline: Int as uint32; settled: Bool; }
struct AgentCleanupInfo { index: Int as uint32; exists: Bool; score: Int as uint16; totalRatings: Int as uint32; registeredAt: Int as uint32; lastActive: Int as uint32; daysSinceActive: Int as uint32; daysSinceRegistered: Int as uint32; eligibleForCleanup: Bool; cleanupReason: Int as uint8; }
struct IntentData { buyer: Address; serviceHash: Int as uint256; budget: Int as coins; deadline: Int as uint32; status: Int as uint8; acceptedOffer: Int as uint32; isExpired: Bool; }
struct OfferData { seller: Address; intentIndex: Int as uint32; price: Int as coins; deliveryTime: Int as uint32; status: Int as uint8; }

// ── Contract ──
contract Reputation with Deployable {
    owner: Address;
    fee: Int as coins;
    agentCount: Int as uint32;

    agentOwners: map<Int as uint32, Address>;
    agentAvailable: map<Int as uint32, Bool>;
    agentTotalTasks: map<Int as uint32, Int as uint32>;
    agentSuccesses: map<Int as uint32, Int as uint32>;
    agentRegisteredAt: map<Int as uint32, Int as uint32>;
    agentLastActive: map<Int as uint32, Int as uint32>;
    nameToIndex: map<Int as uint256, Int as uint32>;
    capabilityIndex: map<Int as uint256, Cell>;

    openDisputes: map<Int as uint32, Address>;
    disputeDepositors: map<Int as uint32, Address>;
    disputeBeneficiaries: map<Int as uint32, Address>;
    disputeAmounts: map<Int as uint32, Int>;
    disputeDeadlines: map<Int as uint32, Int as uint32>;
    disputeSettled: map<Int as uint32, Bool>;
    disputeCount: Int as uint32;
    cleanupCursor: Int as uint32;

    intents: map<Int as uint32, Address>;
    intentServiceHashes: map<Int as uint32, Int as uint256>;
    intentBudgets: map<Int as uint32, Int>;
    intentDeadlines: map<Int as uint32, Int as uint32>;
    intentStatuses: map<Int as uint32, Int as uint8>;
    intentAcceptedOffer: map<Int as uint32, Int as uint32>;
    intentCount: Int as uint32;
    intentsByService: map<Int as uint256, Cell>;

    offers: map<Int as uint32, Address>;
    offerIntents: map<Int as uint32, Int as uint32>;
    offerPrices: map<Int as uint32, Int>;
    offerDeliveryTimes: map<Int as uint32, Int as uint32>;
    offerStatuses: map<Int as uint32, Int as uint8>;
    offerCount: Int as uint32;

    intentCleanupCursor: Int as uint32;

    // Per-agent intent quota
    agentActiveIntents: map<Address, Int>;
    maxIntentsPerAgent: Int as uint8;

    init(owner: Address) {
        self.owner = owner;
        self.fee = ton("0.01");
        self.agentCount = 0;
        self.disputeCount = 0;
        self.cleanupCursor = 0;
        self.intentCount = 0;
        self.offerCount = 0;
        self.intentCleanupCursor = 0;
        self.maxIntentsPerAgent = 10;
    }

    // ── Register ──
    receive(msg: Register) {
        require(context().value >= self.fee, "Insufficient fee. Send at least 0.01 TON.");
        let nameHash: Int = sha256(msg.name);
        let existing: Int? = self.nameToIndex.get(nameHash);
        if (existing != null) {
            let idx: Int = existing!!;
            let agentOwner: Address? = self.agentOwners.get(idx);
            require(agentOwner != null && sender() == agentOwner!!, "Only the agent owner can update");
            self.agentAvailable.set(idx, msg.available);
            self.agentLastActive.set(idx, now());
        } else {
            let idx: Int = self.agentCount;
            self.agentOwners.set(idx, sender());
            self.agentAvailable.set(idx, msg.available);
            self.agentTotalTasks.set(idx, 0);
            self.agentSuccesses.set(idx, 0);
            self.agentRegisteredAt.set(idx, now());
            self.agentLastActive.set(idx, now());
            self.nameToIndex.set(nameHash, idx);
            self.agentCount = self.agentCount + 1;
        }
        self.cleanup(2);
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Agent registered".asComment() });
    }

    receive(msg: Rate) {
        require(context().value >= self.fee, "Insufficient fee. Send at least 0.01 TON.");
        let nameHash: Int = sha256(msg.agentName);
        let existing: Int? = self.nameToIndex.get(nameHash);
        require(existing != null, "Agent not found");
        let idx: Int = existing!!;
        let currentTasks: Int? = self.agentTotalTasks.get(idx);
        if (currentTasks == null) { require(false, "Agent not found"); }
        self.agentTotalTasks.set(idx, currentTasks!! + 1);
        if (msg.success) { self.agentSuccesses.set(idx, self.agentSuccesses.get(idx)!! + 1); }
        self.agentLastActive.set(idx, now());
        self.cleanup(1);
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Rating recorded".asComment() });
    }

    receive(msg: UpdateAvailability) {
        let nameHash: Int = sha256(msg.name);
        let existing: Int? = self.nameToIndex.get(nameHash);
        require(existing != null, "Agent not found");
        let idx: Int = existing!!;
        let agentOwner: Address? = self.agentOwners.get(idx);
        require(agentOwner != null && sender() == agentOwner!!, "Only the agent owner can update availability");
        self.agentAvailable.set(idx, msg.available);
        self.agentLastActive.set(idx, now());
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Availability updated".asComment() });
    }

    receive(msg: IndexCapability) {
        let agentOwner: Address? = self.agentOwners.get(msg.agentIndex);
        require(agentOwner != null, "Agent not found");
        require(sender() == agentOwner!!, "Not the agent owner");
        self.agentLastActive.set(msg.agentIndex, now());
        let existing: Cell? = self.capabilityIndex.get(msg.capabilityHash);
        let builder: Builder = beginCell();
        builder = builder.storeUint(msg.agentIndex, 32);
        if (existing != null) { builder = builder.storeUint(1, 1); builder = builder.storeRef(existing!!); }
        else { builder = builder.storeUint(0, 1); }
        self.capabilityIndex.set(msg.capabilityHash, builder.endCell());
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Capability indexed".asComment() });
    }

    receive(msg: TriggerCleanup) {
        let max: Int = msg.maxClean;
        if (max > 50) { max = 50; }
        if (max < 1) { max = 1; }
        self.cleanup(max);
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Cleanup completed".asComment() });
    }

    receive(msg: NotifyDisputeOpened) {
        let idx: Int = self.disputeCount;
        self.openDisputes.set(idx, msg.escrowAddress);
        self.disputeDepositors.set(idx, msg.depositor);
        self.disputeBeneficiaries.set(idx, msg.beneficiary);
        self.disputeAmounts.set(idx, msg.amount);
        self.disputeDeadlines.set(idx, msg.votingDeadline);
        self.disputeSettled.set(idx, false);
        self.disputeCount = idx + 1;
    }

    receive(msg: NotifyDisputeSettled) {
        let i: Int = 0;
        while (i < self.disputeCount) {
            let addr: Address? = self.openDisputes.get(i);
            if (addr != null && addr!! == msg.escrowAddress) { self.disputeSettled.set(i, true); return; }
            i = i + 1;
        }
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner can withdraw");
        send(SendParameters{ to: self.owner, value: 0, mode: SendRemainingBalance | SendIgnoreErrors, bounce: false, body: "Fees withdrawn".asComment() });
    }

    // ── Intent/Offer Handlers ──

    receive(msg: BroadcastIntent) {
        require(msg.deadline > now(), "Deadline must be in the future");
        require(msg.budget > 0, "Budget must be positive");

        // Quota check
        let currentActive: Int = 0;
        let ca: Int? = self.agentActiveIntents.get(sender());
        if (ca != null) { currentActive = ca!!; }

        if (currentActive >= self.maxIntentsPerAgent) {
            let freed: Bool = self.forceCleanupAgentIntents(sender());
            if (freed) {
                let ca2: Int? = self.agentActiveIntents.get(sender());
                if (ca2 != null) { currentActive = ca2!!; }
                else { currentActive = 0; }
            }
            require(currentActive < self.maxIntentsPerAgent, "Max intents reached. Cancel or wait for expiration.");
        }

        let idx: Int = self.intentCount;
        self.intents.set(idx, sender());
        self.intentServiceHashes.set(idx, msg.serviceHash);
        self.intentBudgets.set(idx, msg.budget);
        self.intentDeadlines.set(idx, msg.deadline);
        self.intentStatuses.set(idx, 0);
        self.intentCount = idx + 1;
        self.agentActiveIntents.set(sender(), currentActive + 1);
        self.addToIntentServiceIndex(msg.serviceHash, idx);
        self.cleanupOneIntent();
        self.cleanup(1);
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Intent broadcast".asComment() });
    }

    receive(msg: SendOffer) {
        let intentStatus: Int? = self.intentStatuses.get(msg.intentIndex);
        require(intentStatus != null, "Intent not found");
        require(intentStatus!! == 0, "Intent not open");
        let deadline: Int? = self.intentDeadlines.get(msg.intentIndex);
        require(deadline != null && now() < deadline!!, "Intent expired");
        let budget: Int? = self.intentBudgets.get(msg.intentIndex);
        require(budget != null && msg.price <= budget!!, "Price exceeds budget");
        let buyer: Address? = self.intents.get(msg.intentIndex);
        require(buyer != null && sender() != buyer!!, "Cannot offer on own intent");
        let idx: Int = self.offerCount;
        self.offers.set(idx, sender());
        self.offerIntents.set(idx, msg.intentIndex);
        self.offerPrices.set(idx, msg.price);
        self.offerDeliveryTimes.set(idx, msg.deliveryTime);
        self.offerStatuses.set(idx, 0);
        self.offerCount = idx + 1;
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Offer sent".asComment() });
    }

    receive(msg: AcceptOffer) {
        let offerStatus: Int? = self.offerStatuses.get(msg.offerIndex);
        require(offerStatus != null, "Offer not found");
        require(offerStatus!! == 0, "Offer not pending");
        let intentIdx: Int? = self.offerIntents.get(msg.offerIndex);
        require(intentIdx != null, "Offer has no intent");
        let buyer: Address? = self.intents.get(intentIdx!!);
        require(buyer != null && sender() == buyer!!, "Not the intent owner");
        let intentStatus: Int? = self.intentStatuses.get(intentIdx!!);
        require(intentStatus != null && intentStatus!! == 0, "Intent not open");
        let deadline: Int? = self.intentDeadlines.get(intentIdx!!);
        require(deadline != null && now() < deadline!!, "Intent expired");
        self.offerStatuses.set(msg.offerIndex, 1);
        self.intentStatuses.set(intentIdx!!, 1);
        self.intentAcceptedOffer.set(intentIdx!!, msg.offerIndex);
        // Decrement buyer's active count (intent no longer open)
        if (buyer != null) { self.decrementAgentIntents(buyer!!); }
        // Reject other pending offers
        let i: Int = 0;
        while (i < self.offerCount) {
            if (i != msg.offerIndex) {
                let oIdx: Int? = self.offerIntents.get(i);
                let oSt: Int? = self.offerStatuses.get(i);
                if (oIdx != null && oIdx!! == intentIdx!! && oSt != null && oSt!! == 0) { self.offerStatuses.set(i, 2); }
            }
            i = i + 1;
        }
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Offer accepted".asComment() });
    }

    receive(msg: SettleDeal) {
        let intentStatus: Int? = self.intentStatuses.get(msg.intentIndex);
        require(intentStatus != null, "Intent not found");
        require(intentStatus!! == 1, "Intent not in accepted state");
        let buyer: Address? = self.intents.get(msg.intentIndex);
        require(buyer != null && sender() == buyer!!, "Not the intent owner");
        self.intentStatuses.set(msg.intentIndex, 2);
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Deal settled".asComment() });
    }

    receive(msg: CancelIntent) {
        let intentStatus: Int? = self.intentStatuses.get(msg.intentIndex);
        require(intentStatus != null, "Intent not found");
        require(intentStatus!! == 0, "Can only cancel open intents");
        let buyer: Address? = self.intents.get(msg.intentIndex);
        require(buyer != null && sender() == buyer!!, "Not the intent owner");
        self.intentStatuses.set(msg.intentIndex, 3);
        self.decrementAgentIntents(sender());
        let i: Int = 0;
        while (i < self.offerCount) {
            let oIdx: Int? = self.offerIntents.get(i);
            let oSt: Int? = self.offerStatuses.get(i);
            if (oIdx != null && oIdx!! == msg.intentIndex && oSt != null && oSt!! == 0) { self.offerStatuses.set(i, 2); }
            i = i + 1;
        }
        send(SendParameters{ to: sender(), value: 0, mode: SendRemainingValue | SendIgnoreErrors, bounce: false, body: "Intent cancelled".asComment() });
    }

    // ── Cleanup ──

    fun cleanup(maxClean: Int) {
        let cleaned: Int = 0; let checked: Int = 0; let i: Int = self.cleanupCursor;
        while (checked < 10 && i < self.agentCount && cleaned < maxClean) {
            let o: Address? = self.agentOwners.get(i);
            if (o != null) {
                let shouldErase: Bool = false;
                let totalTasks: Int? = self.agentTotalTasks.get(i);
                let successes: Int? = self.agentSuccesses.get(i);
                let lastActive: Int? = self.agentLastActive.get(i);
                let registeredAt: Int? = self.agentRegisteredAt.get(i);
                let tt: Int = 0; if (totalTasks != null) { tt = totalTasks!!; }
                let ss: Int = 0; if (successes != null) { ss = successes!!; }
                if (tt >= 100) { let score: Int = (ss * 100) / tt; if (score < 20) { shouldErase = true; } }
                if (!shouldErase && lastActive != null && lastActive!! > 0) { if (now() - lastActive!! > 2592000) { shouldErase = true; } }
                if (!shouldErase && tt == 0 && registeredAt != null && registeredAt!! > 0) { if (now() - registeredAt!! > 604800) { shouldErase = true; } }
                if (shouldErase) { self.eraseAgent(i); cleaned = cleaned + 1; }
            }
            i = i + 1; checked = checked + 1;
        }
        if (i >= self.agentCount) { self.cleanupCursor = 0; } else { self.cleanupCursor = i; }
    }

    fun eraseAgent(index: Int) {
        let agentAddr: Address? = self.agentOwners.get(index);
        self.agentOwners.set(index, null); self.agentAvailable.set(index, null);
        self.agentTotalTasks.set(index, null); self.agentSuccesses.set(index, null);
        self.agentRegisteredAt.set(index, null); self.agentLastActive.set(index, null);

        // Cascade: expire this agent's open intents (max 20)
        if (agentAddr != null) {
            let ci: Int = 0; let cOps: Int = 0;
            while (ci < self.intentCount && cOps < 20) {
                let b: Address? = self.intents.get(ci);
                let s: Int? = self.intentStatuses.get(ci);
                if (b != null && b!! == agentAddr!! && s != null && s!! == 0) {
                    self.expireIntent(ci); cOps = cOps + 1;
                }
                ci = ci + 1;
            }
            // Cascade: expire this agent's pending offers (max 30)
            let cj: Int = 0; let oOps: Int = 0;
            while (cj < self.offerCount && oOps < 30) {
                let sl: Address? = self.offers.get(cj);
                let os: Int? = self.offerStatuses.get(cj);
                if (sl != null && sl!! == agentAddr!! && os != null && os!! == 0) {
                    self.offerStatuses.set(cj, 3); oOps = oOps + 1;
                }
                cj = cj + 1;
            }
            self.agentActiveIntents.set(agentAddr!!, null);
        }
    }

    fun expireIntent(index: Int) {
        let status: Int? = self.intentStatuses.get(index);
        if (status == null || status!! != 0) { return; }
        let buyer: Address? = self.intents.get(index);
        self.intentStatuses.set(index, 4);
        if (buyer != null) { self.decrementAgentIntents(buyer!!); }
        // Expire pending offers for this intent (max 20)
        let j: Int = 0; let ops: Int = 0;
        while (j < self.offerCount && ops < 20) {
            let oi: Int? = self.offerIntents.get(j);
            let os: Int? = self.offerStatuses.get(j);
            if (oi != null && oi!! == index && os != null && os!! == 0) { self.offerStatuses.set(j, 3); ops = ops + 1; }
            j = j + 1;
        }
    }

    fun decrementAgentIntents(agent: Address) {
        let c: Int? = self.agentActiveIntents.get(agent);
        if (c != null && c!! > 0) { self.agentActiveIntents.set(agent, c!! - 1); }
    }

    fun forceCleanupAgentIntents(agent: Address): Bool {
        let checked: Int = 0; let i: Int = 0;
        while (checked < 50 && i < self.intentCount) {
            let b: Address? = self.intents.get(i);
            let s: Int? = self.intentStatuses.get(i);
            if (b != null && b!! == agent && s != null && s!! == 0) {
                let d: Int? = self.intentDeadlines.get(i);
                if (d != null && now() >= d!!) { self.expireIntent(i); return true; }
            }
            i = i + 1; checked = checked + 1;
        }
        return false;
    }

    fun addToIntentServiceIndex(serviceHash: Int, intentIndex: Int) {
        let existing: Cell? = self.intentsByService.get(serviceHash);
        let builder: Builder = beginCell();
        builder = builder.storeUint(intentIndex, 32);
        if (existing != null) { builder = builder.storeUint(1, 1); builder = builder.storeRef(existing!!); }
        else { builder = builder.storeUint(0, 1); }
        self.intentsByService.set(serviceHash, builder.endCell());
    }

    fun cleanupOneIntent() {
        let i: Int = self.intentCleanupCursor; let checked: Int = 0;
        while (checked < 5 && i < self.intentCount) {
            let status: Int? = self.intentStatuses.get(i);
            if (status != null && status!! == 0) {
                let deadline: Int? = self.intentDeadlines.get(i);
                if (deadline != null && now() >= deadline!!) {
                    self.expireIntent(i);
                    self.intentCleanupCursor = i + 1; return;
                }
            }
            i = i + 1; checked = checked + 1;
        }
        if (i >= self.intentCount) { self.intentCleanupCursor = 0; } else { self.intentCleanupCursor = i; }
    }

    // ── Getters ──

    get fun agentData(index: Int): AgentData? {
        if (index < 0 || index >= self.agentCount) { return null; }
        let o: Address? = self.agentOwners.get(index);
        if (o == null) { return null; }
        let tt: Int? = self.agentTotalTasks.get(index); let ss: Int? = self.agentSuccesses.get(index);
        let ra: Int? = self.agentRegisteredAt.get(index); let av: Bool? = self.agentAvailable.get(index);
        return AgentData{ owner: o!!, available: av != null && av!!, totalTasks: tt != null ? tt!! : 0, successes: ss != null ? ss!! : 0, registeredAt: ra != null ? ra!! : 0 };
    }

    get fun agentIndexByNameHash(nameHash: Int): Int? { return self.nameToIndex.get(nameHash); }
    get fun agentReputation(index: Int): Int {
        if (index < 0 || index >= self.agentCount) { return 0; }
        let total: Int? = self.agentTotalTasks.get(index);
        if (total == null || total!! == 0) { return 0; }
        let succ: Int? = self.agentSuccesses.get(index);
        if (succ == null) { return 0; }
        return (succ!! * 100) / total!!;
    }
    get fun agentCount(): Int { return self.agentCount; }
    get fun contractBalance(): Int { return myBalance(); }
    get fun agentsByCapability(capHash: Int): Cell? { return self.capabilityIndex.get(capHash); }
    get fun disputeCount(): Int { return self.disputeCount; }

    get fun disputeData(index: Int): DisputeInfo? {
        if (index < 0 || index >= self.disputeCount) { return null; }
        let addr: Address? = self.openDisputes.get(index);
        if (addr == null) { return null; }
        let settled: Bool? = self.disputeSettled.get(index);
        return DisputeInfo{ escrowAddress: addr!!, depositor: self.disputeDepositors.get(index)!!, beneficiary: self.disputeBeneficiaries.get(index)!!, amount: self.disputeAmounts.get(index)!!, votingDeadline: self.disputeDeadlines.get(index)!!, settled: settled != null && settled!! };
    }

    get fun agentCleanupInfo(index: Int): AgentCleanupInfo {
        let o: Address? = self.agentOwners.get(index);
        if (o == null) { return AgentCleanupInfo{ index: index, exists: false, score: 0, totalRatings: 0, registeredAt: 0, lastActive: 0, daysSinceActive: 0, daysSinceRegistered: 0, eligibleForCleanup: false, cleanupReason: 0 }; }
        let tt: Int = 0; let ttr: Int? = self.agentTotalTasks.get(index); if (ttr != null) { tt = ttr!!; }
        let ss: Int = 0; let ssr: Int? = self.agentSuccesses.get(index); if (ssr != null) { ss = ssr!!; }
        let score: Int = 0; if (tt > 0) { score = (ss * 100) / tt; }
        let ra: Int = 0; let rar: Int? = self.agentRegisteredAt.get(index); if (rar != null) { ra = rar!!; }
        let la: Int = 0; let lar: Int? = self.agentLastActive.get(index); if (lar != null) { la = lar!!; }
        let dsa: Int = 0; if (la > 0) { dsa = (now() - la) / 86400; }
        let dsr: Int = 0; if (ra > 0) { dsr = (now() - ra) / 86400; }
        let reason: Int = 0;
        if (tt >= 100 && score < 20) { reason = 1; }
        if (reason == 0 && la > 0 && now() - la > 2592000) { reason = 2; }
        if (reason == 0 && tt == 0 && ra > 0 && now() - ra > 604800) { reason = 3; }
        return AgentCleanupInfo{ index: index, exists: true, score: score, totalRatings: tt, registeredAt: ra, lastActive: la, daysSinceActive: dsa, daysSinceRegistered: dsr, eligibleForCleanup: reason > 0, cleanupReason: reason };
    }

    get fun intentsByServiceHash(serviceHash: Int): Cell? { return self.intentsByService.get(serviceHash); }
    get fun intentCount(): Int { return self.intentCount; }
    get fun offerCount(): Int { return self.offerCount; }

    get fun agentIntentQuota(agent: Address): Int {
        let c: Int? = self.agentActiveIntents.get(agent);
        if (c != null) { return c!!; }
        return 0;
    }

    get fun intentData(index: Int): IntentData {
        let buyer: Address = self.intents.get(index)!!;
        let status: Int = self.intentStatuses.get(index)!!;
        let deadline: Int = self.intentDeadlines.get(index)!!;
        let ao: Int = 0; let aov: Int? = self.intentAcceptedOffer.get(index); if (aov != null) { ao = aov!!; }
        return IntentData{ buyer: buyer, serviceHash: self.intentServiceHashes.get(index)!!, budget: self.intentBudgets.get(index)!!, deadline: deadline, status: status, acceptedOffer: ao, isExpired: status == 0 && now() >= deadline };
    }

    get fun offerData(index: Int): OfferData {
        return OfferData{ seller: self.offers.get(index)!!, intentIndex: self.offerIntents.get(index)!!, price: self.offerPrices.get(index)!!, deliveryTime: self.offerDeliveryTimes.get(index)!!, status: self.offerStatuses.get(index)!! };
    }
}
