import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
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

const OWNER_SECRET = new Uint8Array(32).fill(0x11);
const OTHER_SECRET = new Uint8Array(32).fill(0x22);

class CounterSimulator {
  readonly contract = new Contract<CounterPrivateState>(createCounterWitnesses());
  private context: CircuitContext<CounterPrivateState>;

  constructor(privateStateSecret = OWNER_SECRET, committedSecret = OWNER_SECRET) {
    const privateState = createCounterPrivateState(privateStateSecret);
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

  getLedger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  increment(): Ledger {
    this.context = this.contract.impureCircuits.increment(this.context).context;
    return this.getLedger();
  }
}

describe('private-owner counter', () => {
  it('increments exactly once for the committed owner secret', () => {
    const simulator = new CounterSimulator();

    assert.equal(simulator.getLedger().counter, 0n);
    assert.equal(simulator.increment().counter, 1n);
  });

  it('rejects another secret without changing public state', () => {
    const simulator = new CounterSimulator(OTHER_SECRET, OWNER_SECRET);
    const before = simulator.getLedger();

    assert.throws(
      () => simulator.increment(),
      /owner secret does not match commitment/,
    );
    assert.deepEqual(simulator.getLedger(), before);
  });

  it('exposes only the counter and commitment in decoded public state', () => {
    const simulator = new CounterSimulator();
    const publicLedger = simulator.getLedger();
    const commitment = pureCircuits.deriveOwnerCommitment(OWNER_SECRET);

    assert.deepEqual(Object.keys(publicLedger).sort(), ['counter', 'ownerCommitment']);
    assert.equal(publicLedger.counter, 0n);
    assert.deepEqual(publicLedger.ownerCommitment, commitment);
    assert.notEqual(
      Buffer.from(publicLedger.ownerCommitment).toString('hex'),
      Buffer.from(OWNER_SECRET).toString('hex'),
    );
    assert.equal('secretKey' in publicLedger, false);
  });
});
