export interface CounterPrivateState {
  readonly secretKey: Uint8Array;
}

export function createCounterPrivateState(secretKey: Uint8Array): CounterPrivateState {
  if (secretKey.length !== 32) {
    throw new Error(`Counter owner secret must be 32 bytes; received ${secretKey.length}.`);
  }
  return { secretKey: new Uint8Array(secretKey) };
}

export const createCounterWitnesses = () => ({
  secretKey: ({
    privateState,
  }: {
    privateState: CounterPrivateState;
  }): [CounterPrivateState, Uint8Array] => [privateState, privateState.secretKey],
});
