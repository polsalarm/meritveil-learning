import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

const CONTRACT_ADDRESS_PATTERN = /^[0-9a-f]{64}$/i;

function requireUrl(name: string, value: string, protocol: 'https:' | 'wss:'): string {
  const parsed = new URL(value);
  if (parsed.protocol !== protocol) {
    throw new Error(`${name} must use ${protocol}`);
  }
  return parsed.toString();
}

const networkId = (import.meta.env.VITE_NETWORK_ID || 'preprod') as NetworkId;
if (networkId !== 'preprod') {
  throw new Error(`MeritVeil Level 2 requires preprod; received ${networkId}.`);
}

const rawDefaultContract = import.meta.env.VITE_DEFAULT_CONTRACT?.trim() ?? '';
if (rawDefaultContract && !CONTRACT_ADDRESS_PATTERN.test(rawDefaultContract)) {
  throw new Error('VITE_DEFAULT_CONTRACT must be a 64-character hexadecimal address.');
}

export const browserConfig = Object.freeze({
  networkId,
  indexerUrl: requireUrl(
    'VITE_INDEXER_URL',
    import.meta.env.VITE_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql',
    'https:',
  ),
  indexerWsUrl: requireUrl(
    'VITE_INDEXER_WS_URL',
    import.meta.env.VITE_INDEXER_WS_URL || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    'wss:',
  ),
  defaultContract: rawDefaultContract ? rawDefaultContract as ContractAddress : null,
});

export function parseContractAddress(value: string): ContractAddress {
  const address = value.trim();
  if (!CONTRACT_ADDRESS_PATTERN.test(address)) {
    throw new Error('Contract address must contain exactly 64 hexadecimal characters.');
  }
  return address as ContractAddress;
}
