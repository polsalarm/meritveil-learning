import { setTimeout as delay } from 'node:timers/promises';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Capabilities, SerializedTransaction } from '@midnight-ntwrk/wallet-sdk';
import type { FinalizedTransaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { u8aToHex } from '@polkadot/util';

const POLL_INTERVAL_MS = 2_000;
const FINALITY_TIMEOUT_MS = 5 * 60 * 1_000;

type SubmissionStatus = 'Submitted' | 'InBlock' | 'Finalized';

type FinalizedLocation = {
  blockHash: `0x${string}`;
  blockHeight: bigint;
};

async function waitForFinalizedTransaction(
  api: ApiPromise,
  txHash: `0x${string}`,
  firstHeight: bigint,
): Promise<FinalizedLocation> {
  let nextHeight = firstHeight;
  const deadline = Date.now() + FINALITY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const finalizedHash = await api.rpc.chain.getFinalizedHead();
    const finalizedHeader = await api.rpc.chain.getHeader(finalizedHash);
    const finalizedHeight = finalizedHeader.number.toBigInt();

    while (nextHeight <= finalizedHeight) {
      const blockHash = await api.rpc.chain.getBlockHash(nextHeight);
      const { block } = await api.rpc.chain.getBlock(blockHash);
      if (block.extrinsics.some((extrinsic) => extrinsic.hash.toHex() === txHash)) {
        return {
          blockHash: blockHash.toHex(),
          blockHeight: nextHeight,
        };
      }
      nextHeight += 1n;
    }

    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`Transaction ${txHash} did not finalize within ${FINALITY_TIMEOUT_MS / 1_000} seconds`);
}

/**
 * Submit with one-shot author_submitExtrinsic, then poll finalized blocks.
 * Preview currently closes submitAndWatchExtrinsic subscriptions with code
 * 1000, while one-shot RPC calls over the same WebSocket remain healthy.
 */
export function makePollingSubmissionService(
  config: Capabilities.DefaultSubmissionConfiguration,
): Capabilities.SubmissionService<FinalizedTransaction> {
  async function submitTransaction(
    transaction: FinalizedTransaction,
    waitForStatus: 'Submitted',
  ): Promise<Capabilities.SubmissionEventCases.Submitted>;
  async function submitTransaction(
    transaction: FinalizedTransaction,
    waitForStatus: 'InBlock',
  ): Promise<Capabilities.SubmissionEventCases.InBlock>;
  async function submitTransaction(
    transaction: FinalizedTransaction,
    waitForStatus: 'Finalized',
  ): Promise<Capabilities.SubmissionEventCases.Finalized>;
  async function submitTransaction(
    transaction: FinalizedTransaction,
  ): Promise<Capabilities.SubmissionEventCases.InBlock>;
  async function submitTransaction(
    transaction: FinalizedTransaction,
    waitForStatus: SubmissionStatus = 'InBlock',
  ): Promise<Capabilities.SubmissionEvent> {
    const provider = new WsProvider(config.relayURL.toString());
    const api = await ApiPromise.create({ provider, noInitWarn: true });

    try {
      const startingHash = await api.rpc.chain.getFinalizedHead();
      const startingHeader = await api.rpc.chain.getHeader(startingHash);
      const serialized = SerializedTransaction.from(transaction);
      const extrinsic = api.tx.midnight.sendMnTransaction(u8aToHex(transaction.serialize()));
      const submittedHash = await extrinsic.send();
      const txHash = submittedHash.toHex();
      if (waitForStatus === 'Submitted') {
        return Capabilities.SubmissionEvent.Submitted({ tx: serialized, txHash });
      }

      const location = await waitForFinalizedTransaction(api, txHash, startingHeader.number.toBigInt());
      if (waitForStatus === 'Finalized') {
        return Capabilities.SubmissionEvent.Finalized({ tx: serialized, txHash, ...location });
      }
      return Capabilities.SubmissionEvent.InBlock({ tx: serialized, txHash, ...location });
    } finally {
      await api.disconnect();
    }
  }

  return {
    submitTransaction,
    close: async () => undefined,
  };
}
