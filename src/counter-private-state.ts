import { createHash, randomBytes } from 'node:crypto';

export interface CounterPrivateState {
  readonly secretKey: Uint8Array;
}

export function createCounterPrivateState(secretKey?: Uint8Array): CounterPrivateState {
  const key = secretKey ?? randomBytes(32);
  if (key.length !== 32) {
    throw new Error(`Counter owner secret must be 32 bytes; received ${key.length}.`);
  }
  return { secretKey: new Uint8Array(key) };
}

export function createCounterPrivateStateFromWalletSeed(seedHex: string): CounterPrivateState {
  if (!/^[0-9a-f]+$/i.test(seedHex) || seedHex.length % 2 !== 0) {
    throw new Error('Wallet seed must be an even-length hexadecimal string.');
  }
  const secretKey = createHash('sha256')
    .update('meritveil-learning:counter-owner:v1', 'utf8')
    .update(Buffer.from(seedHex, 'hex'))
    .digest();
  return createCounterPrivateState(secretKey);
}

export const createCounterWitnesses = () => ({
  secretKey: ({
    privateState,
  }: {
    privateState: CounterPrivateState;
  }): [CounterPrivateState, Uint8Array] => [privateState, privateState.secretKey],
});
