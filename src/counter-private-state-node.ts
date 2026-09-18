import { createHash } from 'node:crypto';
import { createCounterPrivateState, type CounterPrivateState } from './counter-private-state';

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
