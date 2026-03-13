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

struct EscrowData {
    depositor: Address;
    beneficiary: Address;
    arbiter: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    released: Bool;
    refunded: Bool;
}

contract Escrow with Deployable {
    depositor: Address;
    beneficiary: Address;
    arbiter: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    released: Bool;
    refunded: Bool;

    init(depositor: Address, beneficiary: Address, arbiter: Address, deadline: Int) {
        self.depositor = depositor;
        self.beneficiary = beneficiary;
        self.arbiter = arbiter;
        self.amount = 0;
        self.deadline = deadline;
        self.released = false;
        self.refunded = false;
    }

    // Accept deposits
    receive(msg: Deposit) {
        require(!self.released && !self.refunded, "Escrow already settled");
        self.amount = self.amount + context().value;
    }

    // Release funds to beneficiary (only depositor or arbiter)
    receive(msg: Release) {
        let sender: Address = context().sender;
        require(sender == self.depositor || sender == self.arbiter, "Not authorized");
        require(!self.released && !self.refunded, "Already settled");
        require(self.amount > 0, "No funds");

        self.released = true;
        send(SendParameters{
            to: self.beneficiary,
            value: self.amount - ton("0.01"),
            mode: SendRemainingBalance,
            bounce: false,
            body: "Escrow released".asComment()
        });
    }

    // Refund to depositor (only depositor/arbiter, or anyone after deadline)
    receive(msg: Refund) {
        let sender: Address = context().sender;
        let pastDeadline: Bool = now() > self.deadline;
        require(
            sender == self.depositor || sender == self.arbiter || pastDeadline,
            "Not authorized and deadline not passed"
        );
        require(!self.released && !self.refunded, "Already settled");
        require(self.amount > 0, "No funds");

        self.refunded = true;
        send(SendParameters{
            to: self.depositor,
            value: self.amount - ton("0.01"),
            mode: SendRemainingBalance,
            bounce: false,
            body: "Escrow refunded".asComment()
        });
    }

    // Get escrow state
    get fun escrowData(): EscrowData {
        return EscrowData{
            depositor: self.depositor,
            beneficiary: self.beneficiary,
            arbiter: self.arbiter,
            amount: self.amount,
            deadline: self.deadline,
            released: self.released,
            refunded: self.refunded
        };
    }

    get fun balance(): Int {
        return myBalance();
    }
}