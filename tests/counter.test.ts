import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
  type ProofData,
} from '@midnight-ntwrk/compact-runtime';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
} from '../managed/counter/contract/index.js';
import {
  createCounterPrivateState,
  createCounterWitnesses,
  type CounterPrivateState,
} from '../src/counter-private-state.js';

setNetworkId('undeployed');

// Non-repeating byte patterns so a leaked secret cannot be confused with padding or zero cells.
const OWNER_SECRET = new Uint8Array(32).map((_, index) => (index * 37 + 5) & 0xff);
const OTHER_SECRET = new Uint8Array(32).map((_, index) => (index * 53 + 11) & 0xff);

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/** Serializes circuit proof data with byte arrays as hex so secrets can be searched for. */
function hexDump(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item instanceof Uint8Array) return hex(item);
    if (typeof item === 'bigint') return item.toString();
    return item;
  });
}

class CounterSimulator {
  readonly contract = new Contract<CounterPrivateState>(createCounterWitnesses());
  private context: CircuitContext<CounterPrivateState>;
  lastProofData: ProofData | null = null;

  constructor(callerSecret = OWNER_SECRET, committedSecret = OWNER_SECRET) {
    const privateState = createCounterPrivateState(callerSecret);
    const commitment = pureCircuits.deriveOwnerCommitment(committedSecret);
    const initial = this.contract.initialState(
      createConstructorContext(privateState, '0'.repeat(64)),
      commitment,
    );
    this.context = createCircuitContext(
      sampleContractAddress(),
      initial.currentZswapLocalState,
      initial.currentContractState,
      initial.currentPrivateState,
    );
  }

  /** Simulates a different browser calling the same deployed contract. */
  useCallerSecret(secret: Uint8Array): void {
    this.context = { ...this.context, currentPrivateState: createCounterPrivateState(secret) };
  }

  getLedger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  /** Hex dump of every cell stored in the contract's public ledger. */
  storedStateDump(): string {
    return this.context.currentQueryContext.state.state.toString();
  }

  increment(): Ledger {
    const result = this.contract.impureCircuits.increment(this.context);
    this.context = result.context;
    this.lastProofData = result.proofData;
    return this.getLedger();
  }
}

describe('owner authorization', () => {
  it('increments exactly once for the committed owner secret', () => {
    const simulator = new CounterSimulator();

    assert.equal(simulator.getLedger().counter, 0n);
    assert.equal(simulator.increment().counter, 1n);
  });

  it('counts every successful owner increment', () => {
    const simulator = new CounterSimulator();

    assert.deepEqual(
      [simulator.increment().counter, simulator.increment().counter, simulator.increment().counter],
      [1n, 2n, 3n],
    );
  });

  it('rejects another secret without changing public state', () => {
    const simulator = new CounterSimulator(OTHER_SECRET, OWNER_SECRET);
    const before = simulator.getLedger();

    assert.throws(() => simulator.increment(), /owner secret does not match commitment/);
    assert.deepEqual(simulator.getLedger(), before);
  });

  it('keeps rejecting an intruder mid-history while the owner can continue', () => {
    const simulator = new CounterSimulator();
    simulator.increment();

    simulator.useCallerSecret(OTHER_SECRET);
    assert.throws(() => simulator.increment(), /owner secret does not match commitment/);
    assert.equal(simulator.getLedger().counter, 1n);

    simulator.useCallerSecret(OWNER_SECRET);
    assert.equal(simulator.increment().counter, 2n);
  });

  it('rejects the original owner on a counter committed to someone else', () => {
    const simulator = new CounterSimulator(OWNER_SECRET, OTHER_SECRET);

    assert.throws(() => simulator.increment(), /owner secret does not match commitment/);
    assert.equal(simulator.getLedger().counter, 0n);
  });
});

describe('owner commitment', () => {
  it('re-derives the same commitment for the same secret and distinct ones for different secrets', () => {
    const owner = hex(pureCircuits.deriveOwnerCommitment(OWNER_SECRET));

    assert.equal(hex(pureCircuits.deriveOwnerCommitment(new Uint8Array(OWNER_SECRET))), owner);
    assert.notEqual(hex(pureCircuits.deriveOwnerCommitment(OTHER_SECRET)), owner);
    assert.notEqual(owner, hex(OWNER_SECRET));
  });
});

describe('privacy', () => {
  it('exposes only the counter and commitment in decoded public state', () => {
    const simulator = new CounterSimulator();
    const publicLedger = simulator.getLedger();

    assert.deepEqual(Object.keys(publicLedger).sort(), ['counter', 'ownerCommitment']);
    assert.equal(publicLedger.counter, 0n);
    assert.deepEqual(publicLedger.ownerCommitment, pureCircuits.deriveOwnerCommitment(OWNER_SECRET));
  });

  it('keeps the secret out of the public transcript and only in private witness outputs', () => {
    const simulator = new CounterSimulator();
    simulator.increment();
    assert.ok(simulator.lastProofData);

    const secretHex = hex(OWNER_SECRET);
    const publicTranscript = hexDump(simulator.lastProofData.publicTranscript);
    assert.ok(publicTranscript.includes(hex(pureCircuits.deriveOwnerCommitment(OWNER_SECRET))));
    assert.equal(publicTranscript.includes(secretHex), false);
    assert.ok(hexDump(simulator.lastProofData.privateTranscriptOutputs).includes(secretHex));
  });

  it('never stores the secret in on-chain ledger cells after increments', () => {
    const simulator = new CounterSimulator();
    simulator.increment();
    simulator.increment();

    const stored = simulator.storedStateDump();
    assert.ok(stored.includes(hex(pureCircuits.deriveOwnerCommitment(OWNER_SECRET))));
    assert.equal(stored.includes(hex(OWNER_SECRET)), false);
  });
});
