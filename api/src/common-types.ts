import type { FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type * as Counter from '../../managed/counter/contract/index.js';
import type { CounterPrivateState } from '../../src/counter-private-state';

export const COUNTER_PRIVATE_STATE_ID = 'counterOwnerPrivateStateV1';
export type CounterPrivateStateId = typeof COUNTER_PRIVATE_STATE_ID;
export type CounterCircuitKeys = 'increment';
export type CounterContract = Counter.Contract<CounterPrivateState>;
export type CounterProviders = MidnightProviders<CounterCircuitKeys, CounterPrivateStateId, CounterPrivateState>;
export type FoundCounterContract = FoundContract<CounterContract>;

export interface CounterState {
  readonly contractAddress: ContractAddress;
  readonly counter: bigint;
  readonly ownerCommitment: string;
}
