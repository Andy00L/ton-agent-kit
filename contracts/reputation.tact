import "@stdlib/deploy";

// ── Agent Messages ──
message Register { name: String; capabilities: String; available: Bool; }
message Rate { agentName: String; success: Bool; dealIndex: Int as uint32; }
message UpdateAvailability { name: String; available: Bool; }
message Withdraw {}
message IndexCapability { agentIndex: Int as uint32; capabilityHash: Int as uint256; }
message TriggerCleanup { maxClean: Int as uint8; }
message RegisterEscrow { escrowAddress: Address; }

// ── Cross-contract ──
message NotifyDisputeOpened { escrowAddress: Address; depositor: Address; beneficiary: Address; amount: Int as coins; votingDeadline: Int as uint32; }
message NotifyDisputeSettled { escrowAddress: Address; released: Bool; refunded: Bool; }

// ── Intent/Offer Messages ──
message BroadcastIntent { serviceHash: Int as uint256; serviceName: String; budget: Int as coins; deadline: Int as uint32; description: String; }
message SendOffer { intentIndex: Int as uint32; price: Int as coins; deliveryTime: Int as uint32; endpoint: String; }
message AcceptOffer { offerIndex: Int as uint32; }
message CancelIntent { intentIndex: Int as uint32; }
message SettleDeal { intentIndex: Int as uint32; rating: Int as uint8; }

// ── Structs ──
struct AgentData { owner: Address; available: Bool; totalTasks: Int as uint32; successes: Int as uint32; registeredAt: Int as uint32; }
struct DisputeInfo { escrowAddress: Address; depositor: Address; beneficiary: Address; amount: Int as coins; votingDeadline: Int as uint32; settled: Bool; }
struct AgentCleanupInfo { index: Int as uint32; exists: Bool; score: Int as uint16; totalRatings: Int as uint32; registeredAt: Int as uint32; lastActive: Int as uint32; daysSinceActive: Int as uint32; daysSinceRegistered: Int as uint32; eligibleForCleanup: Bool; cleanupReason: Int as uint8; }
struct IntentData { buyer: Address; serviceHash: Int as uint256; serviceName: String; budget: Int as coins; deadline: Int as uint32; status: Int as uint8; acceptedOffer: Int as uint32; isExpired: Bool; description: String; }
struct OfferData { seller: Address; intentIndex: Int as uint32; price: Int as coins; deliveryTime: Int as uint32; status: Int as uint8; endpoint: String; }
struct StorageInfo { storageFund: Int as coins; totalCells: Int as uint32; annualCost: Int as coins; yearsCovered: Int as uint32; }

// ── Contract ──
contract Reputation with Deployable {
    override const storageReserve: Int = ton("0.05");

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
    intentServiceNames: map<Int as uint32, Cell>;
    intentBudgets: map<Int as uint32, Int>;
    intentDeadlines: map<Int as uint32, Int as uint32>;
    intentStatuses: map<Int as uint32, Int as uint8>;
    intentAcceptedOffer: map<Int as uint32, Int as uint32>;
    intentCount: Int as uint32;
    intentsByService: map<Int as uint256, Cell>;
    intentDescriptions: map<Int as uint32, Cell>;

    offers: map<Int as uint32, Address>;
    offerIntents: map<Int as uint32, Int as uint32>;
    offerPrices: map<Int as uint32, Int>;
    offerDeliveryTimes: map<Int as uint32, Int as uint32>;
    offerStatuses: map<Int as uint32, Int as uint8>;
    offerEndpoints: map<Int as uint32, Cell>;
    offerCount: Int as uint32;

    intentCleanupCursor: Int as uint32;

    // Per-agent intent quota
    agentActiveIntents: map<Address, Int>;
    maxIntentsPerAgent: Int as uint8;

    // FIX 5: store name hashes for cleanup
    agentNameHashes: map<Int as uint32, Int as uint256>;

    // FIX 2: escrow whitelist
    knownEscrows: map<Address, Bool>;

    // FIX 3: deal-based rating permissions
    // dealBuyers/dealSellers keyed by deal index (= intentIndex of settled deal)
    dealBuyers: map<Int as uint32, Address>;
    dealSellers: map<Int as uint32, Address>;
    dealBuyerRated: map<Int as uint32, Bool>;
    dealSellerRated: map<Int as uint32, Bool>;
    dealCount: Int as uint32;

    // FIX 4: per-intent offer index
    intentOffers: map<Int as uint32, Cell>;

    // FIX 12: dedup IndexCapability — prevent same agent+capability indexed twice
    agentCapIndexed: map<Int as uint256, Bool>;
    agentIndexedCaps: map<Int as uint32, Cell>;

    // Self-funding pools
    storageFund: Int as coins;
    accumulatedFees: Int as coins;

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
        self.dealCount = 0;
        self.storageFund = 0;
        self.accumulatedFees = 0;
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
            self.agentNameHashes.set(idx, nameHash);
            self.agentCount = self.agentCount + 1;
        }
        self.cleanup(2);
        self.storageFund = self.storageFund + ton("0.015");
        self.accumulatedFees = self.accumulatedFees + self.fee;
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: Rate) {
        require(context().value >= self.fee, "Insufficient fee. Send at least 0.01 TON.");
        let nameHash: Int = sha256(msg.agentName);
        let existing: Int? = self.nameToIndex.get(nameHash);
        require(existing != null, "Agent not found");
        let idx: Int = existing!!;
        let currentTasks: Int? = self.agentTotalTasks.get(idx);
        if (currentTasks == null) { require(false, "Agent not found"); }

        // FIX 3: verify deal-based rating permission
        let dealBuyer: Address? = self.dealBuyers.get(msg.dealIndex);
        let dealSeller: Address? = self.dealSellers.get(msg.dealIndex);
        require(dealBuyer != null && dealSeller != null, "Deal not found");
        let agentOwner: Address? = self.agentOwners.get(idx);
        require(agentOwner != null, "Agent not found");
        let isBuyerRatingSeller: Bool = sender() == dealBuyer!! && agentOwner!! == dealSeller!!;
        let isSellerRatingBuyer: Bool = sender() == dealSeller!! && agentOwner!! == dealBuyer!!;
        require(isBuyerRatingSeller || isSellerRatingBuyer, "Not authorized to rate from this deal");
        if (isBuyerRatingSeller) {
            let alreadyRated: Bool? = self.dealBuyerRated.get(msg.dealIndex);
            require(alreadyRated == null || alreadyRated!! == false, "Already rated in this deal");
            self.dealBuyerRated.set(msg.dealIndex, true);
        } else {
            let alreadyRated: Bool? = self.dealSellerRated.get(msg.dealIndex);
            require(alreadyRated == null || alreadyRated!! == false, "Already rated in this deal");
            self.dealSellerRated.set(msg.dealIndex, true);
        }

        self.agentTotalTasks.set(idx, currentTasks!! + 1);
        if (msg.success) { self.agentSuccesses.set(idx, self.agentSuccesses.get(idx)!! + 1); }
        self.agentLastActive.set(idx, now());
        self.cleanup(1);
        self.storageFund = self.storageFund + ton("0.003");
        self.accumulatedFees = self.accumulatedFees + self.fee;
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
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
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: IndexCapability) {
        let agentOwner: Address? = self.agentOwners.get(msg.agentIndex);
        require(agentOwner != null, "Agent not found");
        require(sender() == agentOwner!!, "Not the agent owner");

        // FIX 12: dedup check — prevent same agent+capability indexed twice
        let dedupKey: Int = (msg.agentIndex * 0x10000000000000000) + (msg.capabilityHash % 0x10000000000000000);
        let already: Bool? = self.agentCapIndexed.get(dedupKey);
        require(already == null || already!! == false, "Already indexed");
        self.agentCapIndexed.set(dedupKey, true);

        self.agentLastActive.set(msg.agentIndex, now());
        let existing: Cell? = self.capabilityIndex.get(msg.capabilityHash);
        let builder: Builder = beginCell();
        builder = builder.storeUint(msg.agentIndex, 32);
        if (existing != null) { builder = builder.storeUint(1, 1); builder = builder.storeRef(existing!!); }
        else { builder = builder.storeUint(0, 1); }
        self.capabilityIndex.set(msg.capabilityHash, builder.endCell());

        // FIX 12: store reverse lookup for cleanup in eraseAgent
        let existingCaps: Cell? = self.agentIndexedCaps.get(msg.agentIndex);
        let capNode: Builder = beginCell();
        capNode = capNode.storeUint(msg.capabilityHash, 256);
        if (existingCaps != null) {
            capNode = capNode.storeUint(1, 1);
            capNode = capNode.storeRef(existingCaps!!);
        } else {
            capNode = capNode.storeUint(0, 1);
        }
        self.agentIndexedCaps.set(msg.agentIndex, capNode.endCell());

        self.storageFund = self.storageFund + ton("0.008");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: TriggerCleanup) {
        let max: Int = msg.maxClean;
        if (max > 50) { max = 50; }
        if (max < 1) { max = 1; }
        self.cleanup(max);
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    // FIX 2: escrow whitelist registration
    receive(msg: RegisterEscrow) {
        require(sender() == self.owner, "Only owner can register escrows");
        self.knownEscrows.set(msg.escrowAddress, true);
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: NotifyDisputeOpened) {
        // FIX 2: validate sender is a known escrow
        let isKnown: Bool? = self.knownEscrows.get(sender());
        require(isKnown != null && isKnown!!, "Unknown escrow contract");
        let idx: Int = self.disputeCount;
        self.openDisputes.set(idx, msg.escrowAddress);
        self.disputeDepositors.set(idx, msg.depositor);
        self.disputeBeneficiaries.set(idx, msg.beneficiary);
        self.disputeAmounts.set(idx, msg.amount);
        self.disputeDeadlines.set(idx, msg.votingDeadline);
        self.disputeSettled.set(idx, false);
        self.disputeCount = idx + 1;
        self.storageFund = self.storageFund + ton("0.005");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: NotifyDisputeSettled) {
        // FIX 2: validate sender is a known escrow
        let isKnown: Bool? = self.knownEscrows.get(sender());
        require(isKnown != null && isKnown!!, "Unknown escrow contract");
        let i: Int = 0;
        while (i < self.disputeCount) {
            let addr: Address? = self.openDisputes.get(i);
            if (addr != null && addr!! == msg.escrowAddress) { self.disputeSettled.set(i, true); }
            i = i + 1;
        }
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: Withdraw) {
        require(sender() == self.owner, "Only owner can withdraw");

        // 20-year rule: calculate how many years storageFund covers
        let totalCells: Int = self.agentCount * 3 + self.intentCount * 3;
        let annualCost: Int = totalCells * 240; // nanoTON per cell per year

        let withdrawableFromReserve: Int = 0;
        if (annualCost == 0) {
            withdrawableFromReserve = self.storageFund;
            self.storageFund = 0;
        } else if (annualCost > 0) {
            let yearsCovered: Int = self.storageFund / annualCost;
            if (yearsCovered > 20) {
                let keep20: Int = annualCost * 20;
                withdrawableFromReserve = self.storageFund - keep20;
                self.storageFund = keep20;
            }
        }

        let totalWithdraw: Int = self.accumulatedFees + withdrawableFromReserve;
        require(totalWithdraw > ton("0.005"), "Nothing to withdraw");
        self.accumulatedFees = 0;

        send(SendParameters{
            to: self.owner,
            value: totalWithdraw,
            mode: SendIgnoreErrors,
            bounce: false,
            body: "Fees withdrawn".asComment()
        });
    }

    // ── Intent/Offer Handlers ──

    receive(msg: BroadcastIntent) {
        require(msg.deadline > now(), "Deadline must be in the future");
        require(msg.budget > 0, "Budget must be positive");

        // FIX 10: cap deadline to 24h max
        let maxDeadline: Int = now() + 86400;
        let cappedDeadline: Int = msg.deadline;
        if (cappedDeadline > maxDeadline) {
            cappedDeadline = maxDeadline;
        }

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
        self.intentServiceNames.set(idx, beginCell().storeSlice(msg.serviceName.asSlice()).endCell());
        self.intentBudgets.set(idx, msg.budget);
        self.intentDeadlines.set(idx, cappedDeadline);
        self.intentStatuses.set(idx, 0);
        self.intentDescriptions.set(idx, beginCell().storeSlice(msg.description.asSlice()).endCell());
        self.intentCount = idx + 1;
        self.agentActiveIntents.set(sender(), currentActive + 1);
        // FIX 11: purge dead entries from service index head before prepending
        self.cleanServiceIndexHead(msg.serviceHash);
        self.addToIntentServiceIndex(msg.serviceHash, idx);
        self.cleanupOneIntent();
        self.cleanup(1);
        self.storageFund = self.storageFund + ton("0.015");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
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
        self.offerEndpoints.set(idx, beginCell().storeSlice(msg.endpoint.asSlice()).endCell());
        self.offerCount = idx + 1;
        // FIX 4: add offer to per-intent index
        let existingOffers: Cell? = self.intentOffers.get(msg.intentIndex);
        let offerNode: Builder = beginCell();
        offerNode = offerNode.storeUint(idx, 32);
        if (existingOffers != null) { offerNode = offerNode.storeUint(1, 1); offerNode = offerNode.storeRef(existingOffers!!); }
        else { offerNode = offerNode.storeUint(0, 1); }
        self.intentOffers.set(msg.intentIndex, offerNode.endCell());
        self.storageFund = self.storageFund + ton("0.008");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
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
        // FIX 4: reject other offers using per-intent index (bounded)
        self.rejectIntentOffers(intentIdx!!, msg.offerIndex);
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: SettleDeal) {
        let intentStatus: Int? = self.intentStatuses.get(msg.intentIndex);
        require(intentStatus != null, "Intent not found");
        require(intentStatus!! == 1, "Intent not in accepted state");
        let buyer: Address? = self.intents.get(msg.intentIndex);
        require(buyer != null && sender() == buyer!!, "Not the intent owner");
        self.intentStatuses.set(msg.intentIndex, 2);

        // FIX 6: apply rating to seller + FIX 3: create deal record for rating permissions
        let acceptedOfferIdx: Int? = self.intentAcceptedOffer.get(msg.intentIndex);
        if (acceptedOfferIdx != null) {
            let sellerAddr: Address? = self.offers.get(acceptedOfferIdx!!);
            if (sellerAddr != null) {
                // FIX 3: record deal parties for mutual rating
                let dealIdx: Int = self.dealCount;
                self.dealBuyers.set(dealIdx, buyer!!);
                self.dealSellers.set(dealIdx, sellerAddr!!);
                self.dealBuyerRated.set(dealIdx, false);
                self.dealSellerRated.set(dealIdx, false);
                self.dealCount = dealIdx + 1;

                // FIX 6: apply rating to seller's reputation
                // Find the seller's agent index by scanning agentOwners
                let si: Int = 0;
                while (si < self.agentCount) {
                    let ao: Address? = self.agentOwners.get(si);
                    if (ao != null && ao!! == sellerAddr!!) {
                        let tt: Int? = self.agentTotalTasks.get(si);
                        let ttv: Int = 0; if (tt != null) { ttv = tt!!; }
                        self.agentTotalTasks.set(si, ttv + 1);
                        if (msg.rating >= 50) {
                            let ss: Int? = self.agentSuccesses.get(si);
                            let ssv: Int = 0; if (ss != null) { ssv = ss!!; }
                            self.agentSuccesses.set(si, ssv + 1);
                        }
                        self.agentLastActive.set(si, now());
                        si = self.agentCount; // break
                    }
                    si = si + 1;
                }
            }
        }

        self.storageFund = self.storageFund + ton("0.008");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: CancelIntent) {
        let intentStatus: Int? = self.intentStatuses.get(msg.intentIndex);
        require(intentStatus != null, "Intent not found");
        require(intentStatus!! == 0, "Can only cancel open intents");
        let buyer: Address? = self.intents.get(msg.intentIndex);
        require(buyer != null && sender() == buyer!!, "Not the intent owner");
        self.intentStatuses.set(msg.intentIndex, 3);
        self.decrementAgentIntents(sender());
        // FIX 4: use per-intent offer index instead of full scan
        self.rejectIntentOffers(msg.intentIndex, -1);
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
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

    // FIX 4: bounded offer rejection using per-intent index
    fun rejectIntentOffers(intentIndex: Int, exceptOffer: Int) {
        let node: Cell? = self.intentOffers.get(intentIndex);
        let iterations: Int = 0;
        while (node != null && iterations < 50) {
            let slice: Slice = (node!!).beginParse();
            let offerIdx: Int = slice.loadUint(32);
            if (offerIdx != exceptOffer) {
                let oSt: Int? = self.offerStatuses.get(offerIdx);
                if (oSt != null && oSt!! == 0) { self.offerStatuses.set(offerIdx, 2); }
            }
            if (slice.loadBit()) { node = slice.loadRef(); } else { node = null; }
            iterations = iterations + 1;
        }
    }

    fun eraseAgent(index: Int) {
        let agentAddr: Address? = self.agentOwners.get(index);
        // FIX 5: clean up nameToIndex so the name can be reused
        let nameHash: Int? = self.agentNameHashes.get(index);
        if (nameHash != null) { self.nameToIndex.set(nameHash!!, null); }
        self.agentNameHashes.set(index, null);

        // FIX 12: clean up dedup map for capabilities of the erased agent
        let caps: Cell? = self.agentIndexedCaps.get(index);
        let capIter: Int = 0;
        while (caps != null && capIter < 10) {
            let capSlice: Slice = (caps!!).beginParse();
            let capHash: Int = capSlice.loadUint(256);
            let dedupKey: Int = (index * 0x10000000000000000) + (capHash % 0x10000000000000000);
            self.agentCapIndexed.set(dedupKey, null);
            if (capSlice.loadBit()) { caps = capSlice.loadRef(); } else { caps = null; }
            capIter = capIter + 1;
        }
        self.agentIndexedCaps.set(index, null);

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

    // FIX 11: incremental cleanup of dead entries from intentsByService head
    fun cleanServiceIndexHead(serviceHash: Int) {
        let node: Cell? = self.intentsByService.get(serviceHash);
        let iterations: Int = 0;
        while (node != null && iterations < 3) {
            let slice: Slice = (node!!).beginParse();
            let intentIdx: Int = slice.loadUint(32);
            let status: Int? = self.intentStatuses.get(intentIdx);
            if (status != null && status!! != 0) {
                // Status != 0 → dead (expired/cancelled/settled/accepted)
                if (slice.loadBit()) {
                    node = slice.loadRef();
                    self.intentsByService.set(serviceHash, node);
                } else {
                    self.intentsByService.set(serviceHash, null);
                    node = null;
                }
            } else {
                node = null;  // head is open → stop
            }
            iterations = iterations + 1;
        }
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
        let nameCell: Cell? = self.intentServiceNames.get(index);
        let sn: String = "";
        if (nameCell != null) { sn = (nameCell!!).beginParse().asString(); }
        let descCell: Cell? = self.intentDescriptions.get(index);
        let desc: String = "";
        if (descCell != null) { desc = (descCell!!).beginParse().asString(); }
        return IntentData{ buyer: buyer, serviceHash: self.intentServiceHashes.get(index)!!, serviceName: sn, budget: self.intentBudgets.get(index)!!, deadline: deadline, status: status, acceptedOffer: ao, isExpired: status == 0 && now() >= deadline, description: desc };
    }

    get fun offerData(index: Int): OfferData {
        let epCell: Cell? = self.offerEndpoints.get(index);
        let ep: String = "";
        if (epCell != null) { ep = (epCell!!).beginParse().asString(); }
        return OfferData{ seller: self.offers.get(index)!!, intentIndex: self.offerIntents.get(index)!!, price: self.offerPrices.get(index)!!, deliveryTime: self.offerDeliveryTimes.get(index)!!, status: self.offerStatuses.get(index)!!, endpoint: ep };
    }

    get fun storageInfo(): StorageInfo {
        let totalCells: Int = self.agentCount * 3 + self.intentCount * 3;
        let annualCost: Int = totalCells * 240;
        let yearsCovered: Int = 0;
        if (annualCost > 0) {
            yearsCovered = self.storageFund / annualCost;
        }
        return StorageInfo{
            storageFund: self.storageFund,
            totalCells: totalCells,
            annualCost: annualCost,
            yearsCovered: yearsCovered
        };
    }

    get fun dealCount(): Int { return self.dealCount; }
    get fun storageFundBalance(): Int { return self.storageFund; }
    get fun accumulatedFeesBalance(): Int { return self.accumulatedFees; }
}
