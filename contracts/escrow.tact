import "@stdlib/deploy";
import "@stdlib/ownable";

message Deposit {
    queryId: Int as uint64;
}

message Release {
    queryId: Int as uint64;
}

message Refund {
    queryId: Int as uint64;
}

message DeliveryConfirmed {
    x402TxHash: String;
}

message AutoRelease {}
message OpenDispute {}
message JoinDispute {}
message VoteRelease {}
message VoteRefund {}
message ClaimReward {}
message FallbackSettle {}
message SellerStake {}

// Cross-contract: escrow → reputation
message NotifyDisputeOpened {
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: Int as coins;
    votingDeadline: Int as uint32;
}

message NotifyDisputeSettled {
    escrowAddress: Address;
    released: Bool;
    refunded: Bool;
}

struct EscrowData {
    depositor: Address;
    beneficiary: Address;
    reputationContract: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    released: Bool;
    refunded: Bool;
    deliveryConfirmed: Bool;
    disputed: Bool;
    votingDeadline: Int as uint32;
    arbiterCount: Int as uint16;
    votesRelease: Int as uint16;
    votesRefund: Int as uint16;
    minArbiters: Int as uint8;
    minStake: Int as coins;
    sellerStake: Int as coins;
    sellerStaked: Bool;
    requireSellerStake: Bool;
    baseSellerStake: Int as coins;
    requireRepCollateral: Bool;
    minRepScore: Int as uint8;
    autoReleaseAvailable: Bool;
    refundAvailable: Bool;
    x402ProofHash: String;
}

contract Escrow with Deployable {
    override const storageReserve: Int = ton("0.05");

    depositor: Address;
    beneficiary: Address;
    reputationContract: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    released: Bool;
    refunded: Bool;
    deliveryConfirmed: Bool;

    disputed: Bool;
    votingDeadline: Int as uint32;
    minArbiters: Int as uint8;
    minStake: Int as coins;

    arbiters: map<Int, Address>;
    arbiterIndex: map<Address, Int>;
    stakes: map<Int, Int>;
    voted: map<Int, Bool>;
    votes: map<Int, Bool>;
    arbiterCount: Int as uint16;

    votesRelease: Int as uint16;
    votesRefund: Int as uint16;

    // Layer 3+4: Bidirectional stake + rep collateral
    sellerStake: Int as coins;
    sellerStaked: Bool;
    requireSellerStake: Bool;
    baseSellerStake: Int as coins;
    requireRepCollateral: Bool;
    minRepScore: Int as uint8;
    totalArbiterStakes: Int as coins;
    storageFund: Int as coins;

    // FIX 8: Snapshot at settlement for equal bonus distribution
    settlementWinnerCount: Int as uint16;
    settlementLoserTotal: Int as coins;

    // FIX 9: Store x402 payment proof hash on-chain
    x402ProofHash: String;

    init(
        depositor: Address,
        beneficiary: Address,
        deadline: Int,
        minArbiters: Int,
        minStake: Int,
        reputationContract: Address,
        requireRepCollateral: Bool,
        minRepScore: Int,
        baseSellerStake: Int
    ) {
        self.depositor = depositor;
        self.beneficiary = beneficiary;
        self.reputationContract = reputationContract;
        self.deadline = deadline;
        self.minArbiters = minArbiters;
        self.minStake = minStake;
        self.amount = 0;
        self.released = false;
        self.refunded = false;
        self.deliveryConfirmed = false;
        self.disputed = false;
        self.votingDeadline = 0;
        self.arbiterCount = 0;
        self.votesRelease = 0;
        self.votesRefund = 0;
        self.sellerStake = 0;
        self.sellerStaked = false;
        self.requireSellerStake = requireRepCollateral;
        self.baseSellerStake = baseSellerStake;
        self.requireRepCollateral = requireRepCollateral;
        self.minRepScore = minRepScore;
        self.totalArbiterStakes = 0;
        self.storageFund = 0;
        self.settlementWinnerCount = 0;
        self.settlementLoserTotal = 0;
        self.x402ProofHash = "";
    }

    // Seller deposits their stake (skin in the game)
    receive(msg: SellerStake) {
        require(sender() == self.beneficiary, "Only beneficiary (seller) can stake");
        require(!self.released && !self.refunded, "Already settled");
        require(self.requireSellerStake, "Seller stake not required");
        require(!self.sellerStaked, "Already staked");
        require(context().value > 0, "Must send TON as stake");
        self.sellerStake = context().value;
        self.sellerStaked = true;
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    // Buyer deposits — gated by seller stake if required
    receive(msg: Deposit) {
        require(sender() == self.depositor, "Only depositor can deposit");
        require(!self.released && !self.refunded, "Already settled");
        if (self.requireSellerStake) {
            require(self.sellerStaked, "Seller must stake first");
        }
        self.amount = self.amount + context().value;
        self.storageFund = self.storageFund + ton("0.003");
    }

    receive(msg: DeliveryConfirmed) {
        require(sender() == self.depositor, "Only depositor can confirm delivery");
        require(!self.released && !self.refunded, "Already settled");
        self.deliveryConfirmed = true;
        // FIX 9: store payment proof hash on-chain
        self.x402ProofHash = msg.x402TxHash;
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    // Release — seller gets deal + their stake back (SendRemainingBalance)
    receive(msg: Release) {
        require(!self.released && !self.refunded, "Already settled");
        require(!self.disputed, "Disputed — use voting");
        require(sender() == self.depositor, "Only depositor can release");
        require(self.amount > 0, "No funds");
        self.released = true;
        send(SendParameters{
            to: self.beneficiary, value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
            body: "Escrow released".asComment()
        });
    }

    // Refund — buyer gets deposit + seller's forfeited stake (SendRemainingBalance)
    receive(msg: Refund) {
        require(!self.released && !self.refunded, "Already settled");
        require(!self.disputed, "Disputed — use voting");
        require(self.amount > 0, "No funds");
        if (now() < self.deadline) {
            require(sender() == self.depositor, "Only depositor can refund before deadline");
        } else if (!self.deliveryConfirmed) {
            // After deadline, no delivery: anyone can trigger
        } else {
            require(false, "Delivery confirmed — open a dispute to contest");
        }
        self.refunded = true;
        send(SendParameters{
            to: self.depositor, value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
            body: "Escrow refunded".asComment()
        });
    }

    receive(msg: AutoRelease) {
        require(now() >= self.deadline, "Deadline not reached");
        require(self.deliveryConfirmed, "Delivery not confirmed by buyer");
        require(!self.released && !self.refunded, "Already settled");
        require(!self.disputed, "Disputed — waiting for arbiter vote");
        require(self.amount > 0, "No funds");
        self.released = true;
        send(SendParameters{
            to: self.beneficiary, value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
            body: "Auto-released after deadline".asComment()
        });
    }

    receive(msg: OpenDispute) {
        require(sender() == self.depositor || sender() == self.beneficiary, "Only depositor or beneficiary");
        require(!self.released && !self.refunded, "Already settled");
        require(!self.disputed, "Already disputed");
        self.disputed = true;
        self.votingDeadline = now() + 259200;
        self.storageFund = self.storageFund + ton("0.005");
        send(SendParameters{
            to: self.reputationContract, value: ton("0.03"),
            mode: SendIgnoreErrors, bounce: true,
            body: NotifyDisputeOpened{
                escrowAddress: myAddress(), depositor: self.depositor,
                beneficiary: self.beneficiary, amount: self.amount,
                votingDeadline: self.votingDeadline
            }.toCell()
        });
        nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: JoinDispute) {
        require(self.disputed, "No active dispute");
        require(!self.released && !self.refunded, "Already settled");
        require(now() < self.votingDeadline, "Voting period ended");
        require(self.arbiterCount < 100, "Max arbiters reached");
        require(sender() != self.depositor, "Depositor cannot be arbiter");
        require(sender() != self.beneficiary, "Beneficiary cannot be arbiter");
        let existing: Int? = self.arbiterIndex.get(sender());
        require(existing == null, "Already joined");
        let actualStake: Int = context().value;
        require(actualStake >= self.minStake, "Stake too low");
        let idx: Int = self.arbiterCount;
        self.arbiters.set(idx, sender());
        self.arbiterIndex.set(sender(), idx);
        self.stakes.set(idx, actualStake);
        self.voted.set(idx, false);
        self.arbiterCount = idx + 1;
        self.totalArbiterStakes = self.totalArbiterStakes + actualStake;
        self.storageFund = self.storageFund + ton("0.003");
        nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: VoteRelease) {
        require(self.disputed, "No active dispute");
        require(!self.released && !self.refunded, "Already settled");
        require(self.arbiterCount >= self.minArbiters, "Not enough arbiters yet");
        let idx: Int? = self.arbiterIndex.get(sender());
        require(idx != null, "Not an arbiter");
        // FIX 13: block votes after voting period ends
        require(now() < self.votingDeadline, "Voting period ended");
        let idxVal: Int = idx!!;
        let hasVoted: Bool? = self.voted.get(idxVal);
        require(hasVoted != null, "Not registered");
        require(hasVoted!! == false, "Already voted");
        self.voted.set(idxVal, true);
        self.votes.set(idxVal, true);
        self.votesRelease = self.votesRelease + 1;
        let majority: Int = (self.arbiterCount / 2) + 1;
        if (self.votesRelease >= majority) {
            self.released = true;
            // FIX 8: snapshot bonus distribution at settlement time
            self.settlementWinnerCount = self.getWinnerCount();
            self.settlementLoserTotal = self.getTotalLoserStakes();
            self.notifySettlement();
            // FIX 1: reserve arbiter stakes so ClaimReward works
            nativeReserve(self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
            send(SendParameters{
                to: self.beneficiary, value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
                body: "Released by arbiter vote".asComment()
            });
        } else {
            self.storageFund = self.storageFund + ton("0.003");
            nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors,
                bounce: false,
                body: "Excess".asComment()
            });
        }
    }

    receive(msg: VoteRefund) {
        require(self.disputed, "No active dispute");
        require(!self.released && !self.refunded, "Already settled");
        require(self.arbiterCount >= self.minArbiters, "Not enough arbiters yet");
        let idx: Int? = self.arbiterIndex.get(sender());
        require(idx != null, "Not an arbiter");
        // FIX 13: block votes after voting period ends
        require(now() < self.votingDeadline, "Voting period ended");
        let idxVal: Int = idx!!;
        let hasVoted: Bool? = self.voted.get(idxVal);
        require(hasVoted != null, "Not registered");
        require(hasVoted!! == false, "Already voted");
        self.voted.set(idxVal, true);
        self.votes.set(idxVal, false);
        self.votesRefund = self.votesRefund + 1;
        let majority: Int = (self.arbiterCount / 2) + 1;
        if (self.votesRefund >= majority) {
            self.refunded = true;
            // FIX 8: snapshot bonus distribution at settlement time
            self.settlementWinnerCount = self.getWinnerCount();
            self.settlementLoserTotal = self.getTotalLoserStakes();
            self.notifySettlement();
            // FIX 1: reserve arbiter stakes so ClaimReward works
            nativeReserve(self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
            send(SendParameters{
                to: self.depositor, value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
                body: "Refunded by arbiter vote".asComment()
            });
        } else {
            self.storageFund = self.storageFund + ton("0.003");
            nativeReserve(self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
            send(SendParameters{
                to: sender(),
                value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors,
                bounce: false,
                body: "Excess".asComment()
            });
        }
    }

    receive(msg: ClaimReward) {
        require(self.released || self.refunded, "Not settled yet");
        let idx: Int? = self.arbiterIndex.get(sender());
        require(idx != null, "Not an arbiter");
        let idxVal: Int = idx!!;
        let myStake: Int? = self.stakes.get(idxVal);
        require(myStake != null, "Not registered");
        require(myStake!! > 0, "Already claimed or no stake");
        let hasVoted: Bool? = self.voted.get(idxVal);
        require(hasVoted != null && hasVoted!! == true, "Did not vote");
        let myVote: Bool = self.votes.get(idxVal)!!;
        let wonVote: Bool = (myVote == true && self.released) || (myVote == false && self.refunded);
        self.totalArbiterStakes = self.totalArbiterStakes - myStake!!;
        self.stakes.set(idxVal, 0);
        if (wonVote) {
            // FIX 8: use snapshot values for equal distribution
            let bonus: Int = 0;
            if (self.settlementWinnerCount > 0) { bonus = self.settlementLoserTotal / self.settlementWinnerCount; }
            let payout: Int = myStake!! + bonus;
            send(SendParameters{
                to: sender(), value: payout,
                mode: SendIgnoreErrors, bounce: false,
                body: "Arbiter reward (winner)".asComment()
            });
        }
        // FIX 1: nativeReserve only needs to protect remaining arbiter stakes
        nativeReserve(self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingBalance | SendIgnoreErrors,
            bounce: false,
            body: "Excess".asComment()
        });
    }

    receive(msg: FallbackSettle) {
        require(self.disputed, "No active dispute");
        require(!self.released && !self.refunded, "Already settled");
        require(now() >= self.votingDeadline, "Voting period not ended");
        if (self.arbiterCount < self.minArbiters || self.votesRelease == self.votesRefund) {
            if (self.deliveryConfirmed) { self.released = true; }
            else { self.refunded = true; }
        } else if (self.votesRelease > self.votesRefund) {
            self.released = true;
        } else {
            self.refunded = true;
        }
        // FIX 8: snapshot bonus distribution
        self.settlementWinnerCount = self.getWinnerCount();
        self.settlementLoserTotal = self.getTotalLoserStakes();
        self.notifySettlement();
        // FIX 1: reserve arbiter stakes so ClaimReward works
        if (self.totalArbiterStakes > 0) {
            nativeReserve(self.totalArbiterStakes + self.storageFund + ton("0.01"), 0);
        }
        if (self.released) {
            send(SendParameters{
                to: self.beneficiary, value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
                body: "Fallback: released".asComment()
            });
        } else {
            send(SendParameters{
                to: self.depositor, value: 0,
                mode: SendRemainingBalance | SendIgnoreErrors, bounce: false,
                body: "Fallback: refunded".asComment()
            });
        }
    }

    fun notifySettlement() {
        if (self.disputed) {
            send(SendParameters{
                to: self.reputationContract, value: ton("0.02"),
                mode: SendIgnoreErrors, bounce: true,
                body: NotifyDisputeSettled{
                    escrowAddress: myAddress(),
                    released: self.released, refunded: self.refunded
                }.toCell()
            });
        }
    }

    fun getTotalLoserStakes(): Int {
        let total: Int = 0; let i: Int = 0;
        while (i < self.arbiterCount) {
            let v: Bool? = self.votes.get(i);
            if (v != null) {
                let won: Bool = (v!! == true && self.released) || (v!! == false && self.refunded);
                if (!won) { let s: Int? = self.stakes.get(i); if (s != null && s!! > 0) { total = total + s!!; } }
            }
            i = i + 1;
        }
        return total;
    }

    fun getWinnerCount(): Int {
        let count: Int = 0; let i: Int = 0;
        while (i < self.arbiterCount) {
            let v: Bool? = self.votes.get(i);
            if (v != null) {
                let won: Bool = (v!! == true && self.released) || (v!! == false && self.refunded);
                if (won) { let s: Int? = self.stakes.get(i); if (s != null && s!! > 0) { count = count + 1; } }
            }
            i = i + 1;
        }
        return count;
    }

    get fun escrowData(): EscrowData {
        return EscrowData{
            depositor: self.depositor, beneficiary: self.beneficiary,
            reputationContract: self.reputationContract,
            amount: self.amount, deadline: self.deadline,
            released: self.released, refunded: self.refunded,
            deliveryConfirmed: self.deliveryConfirmed,
            disputed: self.disputed, votingDeadline: self.votingDeadline,
            arbiterCount: self.arbiterCount,
            votesRelease: self.votesRelease, votesRefund: self.votesRefund,
            minArbiters: self.minArbiters, minStake: self.minStake,
            sellerStake: self.sellerStake, sellerStaked: self.sellerStaked,
            requireSellerStake: self.requireSellerStake,
            baseSellerStake: self.baseSellerStake,
            requireRepCollateral: self.requireRepCollateral,
            minRepScore: self.minRepScore,
            autoReleaseAvailable: now() >= self.deadline && self.deliveryConfirmed && !self.released && !self.refunded && !self.disputed,
            refundAvailable: now() >= self.deadline && !self.deliveryConfirmed && !self.released && !self.refunded && !self.disputed,
            x402ProofHash: self.x402ProofHash
        };
    }

    get fun balance(): Int {
        return myBalance();
    }
}
