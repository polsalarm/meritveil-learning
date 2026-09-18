import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { fromHex, toHex, type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import {
  Binding,
  type FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { createProofProvider, type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';
import semver from 'semver';
import {
  CounterAPI,
  type CounterCircuitKeys,
  type CounterPrivateStateId,
  type CounterProviders,
} from '../../api/src/index';
import {
  createCounterPrivateState,
  type CounterPrivateState,
} from '../../src/counter-private-state';
import { browserConfig, parseContractAddress } from './config';
import { inMemoryPrivateStateProvider } from './in-memory-private-state-provider';

const CONNECTOR_VERSION_RANGE = '4.x';
const PRIVATE_SECRET_STORAGE_KEY = 'meritveil-learning:preprod:counter-owner:v1';

export type TransactionPhase = 'idle' | 'proving' | 'submitting' | 'confirmed' | 'rejected' | 'failed';

export interface WalletChoice {
  readonly id: string;
  readonly name: string;
  readonly apiVersion: string;
}

export interface WalletSession {
  readonly walletId: string;
  readonly walletName: string;
  readonly unshieldedAddress: string;
}

type PhaseListener = (phase: TransactionPhase) => void;

function normalizedUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function encodeSecret(secret: Uint8Array): string {
  return btoa(String.fromCharCode(...secret));
}

function decodeSecret(encoded: string): Uint8Array | null {
  try {
    const secret = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return secret.length === 32 ? secret : null;
  } catch {
    return null;
  }
}

export class BrowserCounterManager {
  readonly #privateStateProvider = inMemoryPrivateStateProvider<CounterPrivateStateId, CounterPrivateState>();
  #connectedWallet: ConnectedAPI | null = null;
  #providers: CounterProviders | null = null;
  #phaseListener: PhaseListener = () => undefined;

  discoverWallets(): readonly WalletChoice[] {
    return Object.entries(window.midnight ?? {})
      .filter((entry): entry is [string, InitialAPI] => {
        const api = entry[1];
        return api !== undefined && semver.satisfies(api.apiVersion, CONNECTOR_VERSION_RANGE);
      })
      .map(([id, api]) => ({ id, name: api.name || api.rdns || id, apiVersion: api.apiVersion }));
  }

  setPhaseListener(listener: PhaseListener): void {
    this.#phaseListener = listener;
  }

  async connect(walletId: string): Promise<WalletSession> {
    const wallet = window.midnight?.[walletId];
    if (!wallet) throw new Error('The selected Lace wallet is no longer available.');
    if (!semver.satisfies(wallet.apiVersion, CONNECTOR_VERSION_RANGE)) {
      throw new Error(`Wallet connector ${wallet.apiVersion} is incompatible; version 4.x is required.`);
    }

    const connectedWallet = await wallet.connect(browserConfig.networkId);
    const [configuration, connectionStatus, shieldedAddresses, unshieldedAddress] = await Promise.all([
      connectedWallet.getConfiguration(),
      connectedWallet.getConnectionStatus(),
      connectedWallet.getShieldedAddresses(),
      connectedWallet.getUnshieldedAddress(),
    ]);

    if (connectionStatus.status !== 'connected' || connectionStatus.networkId !== browserConfig.networkId) {
      throw new Error(`Lace must be connected to ${browserConfig.networkId}.`);
    }
    if (configuration.networkId !== browserConfig.networkId) {
      throw new Error(`Lace configuration targets ${configuration.networkId}, not ${browserConfig.networkId}.`);
    }
    if (
      normalizedUrl(configuration.indexerUri) !== normalizedUrl(browserConfig.indexerUrl) ||
      normalizedUrl(configuration.indexerWsUri) !== normalizedUrl(browserConfig.indexerWsUrl)
    ) {
      throw new Error('Lace indexer configuration does not match the MeritVeil Preprod configuration.');
    }

    setNetworkId(browserConfig.networkId);
    const zkConfigProvider = new FetchZkConfigProvider<CounterCircuitKeys>(window.location.origin, fetch.bind(window));
    const proofProvider = createProofProvider(await connectedWallet.getProvingProvider(zkConfigProvider));

    this.#connectedWallet = connectedWallet;
    this.#providers = {
      privateStateProvider: this.#privateStateProvider,
      zkConfigProvider,
      proofProvider,
      publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
      walletProvider: {
        getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
        getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
        balanceTx: async (transaction: UnboundTransaction): Promise<FinalizedTransaction> => {
          const balanced = await connectedWallet.balanceUnsealedTransaction(toHex(transaction.serialize()));
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
            'signature',
            'proof',
            'binding',
            fromHex(balanced.tx),
          );
        },
      },
      midnightProvider: {
        submitTx: async (transaction: FinalizedTransaction): Promise<TransactionId> => {
          this.#phaseListener('submitting');
          await connectedWallet.submitTransaction(toHex(transaction.serialize()));
          const [transactionId] = transaction.identifiers();
          if (!transactionId) throw new Error('Submitted transaction did not expose an identifier.');
          return transactionId;
        },
      },
    };

    return {
      walletId,
      walletName: wallet.name || wallet.rdns || walletId,
      unshieldedAddress: unshieldedAddress.unshieldedAddress,
    };
  }

  disconnect(): void {
    this.#connectedWallet = null;
    this.#providers = null;
    this.#phaseListener('idle');
  }

  async deploy(): Promise<CounterAPI> {
    this.#phaseListener('proving');
    return CounterAPI.deploy(this.requireProviders(), this.privateState());
  }

  async join(contractAddress: string | ContractAddress): Promise<CounterAPI> {
    return CounterAPI.join(this.requireProviders(), parseContractAddress(contractAddress), this.privateState());
  }

  private requireProviders(): CounterProviders {
    if (!this.#connectedWallet || !this.#providers) {
      throw new Error('Connect Lace before interacting with the contract.');
    }
    return this.#providers;
  }

  private privateState(): CounterPrivateState {
    const stored = localStorage.getItem(PRIVATE_SECRET_STORAGE_KEY);
    const restored = stored ? decodeSecret(stored) : null;
    if (restored) return createCounterPrivateState(restored);

    const secret = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(PRIVATE_SECRET_STORAGE_KEY, encodeSecret(secret));
    return createCounterPrivateState(secret);
  }
}
