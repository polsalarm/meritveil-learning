import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as Counter from '../../managed/counter/contract/index.js';
import { createCounterWitnesses } from '../../src/counter-private-state';

export const compiledCounterContract = CompiledContract.make('counter', Counter.Contract).pipe(
  CompiledContract.withWitnesses(createCounterWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/counter'),
);
