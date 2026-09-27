import { deployContract, findDeployedContract, type DeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { map, type Observable } from 'rxjs';
import * as Counter from '../../managed/counter/contract/index.js';
import type { CounterPrivateState } from '../../src/counter-private-state';
import { compiledCounterContract } from './contract';
import {
  COUNTER_PRIVATE_STATE_ID,
  type CounterContract,
  type CounterProviders,
  type CounterState,
  type FoundCounterContract,
} from './common-types';

export class CounterAPI {
  private constructor(
    public readonly deployedContract: FoundCounterContract,
    providers: CounterProviders,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => Counter.ledger(contractState.data)),
        map((ledger): CounterState => ({
          contractAddress: this.deployedContractAddress,
          counter: ledger.counter,
          ownerCommitment: toHex(ledger.ownerCommitment),
        })),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<CounterState>;

  async increment(): Promise<void> {
    await this.deployedContract.callTx.increment();
  }

  static async deploy(
    providers: CounterProviders,
    privateState: CounterPrivateState,
  ): Promise<CounterAPI> {
    const ownerCommitment = Counter.pureCircuits.deriveOwnerCommitment(privateState.secretKey);
    const deployedContract: DeployedContract<CounterContract> = await deployContract(providers, {
      compiledContract: compiledCounterContract,
      args: [ownerCommitment],
      privateStateId: COUNTER_PRIVATE_STATE_ID,
      initialPrivateState: privateState,
    });
    return new CounterAPI(deployedContract, providers);
  }

  static async join(
    providers: CounterProviders,
    contractAddress: ContractAddress,
    privateState: CounterPrivateState,
  ): Promise<CounterAPI> {
    // findDeployedContract waits indefinitely for a deployment that may never exist; fail fast instead.
    if (!(await providers.publicDataProvider.queryContractState(contractAddress))) {
      throw new Error(`No contract is deployed at ${contractAddress} on this network.`);
    }
    const deployedContract = await findDeployedContract(providers, {
      contractAddress,
      compiledContract: compiledCounterContract,
      privateStateId: COUNTER_PRIVATE_STATE_ID,
      initialPrivateState: privateState,
    });
    return new CounterAPI(deployedContract, providers);
  }
}

export { compiledCounterContract } from './contract';
export * from './common-types';
