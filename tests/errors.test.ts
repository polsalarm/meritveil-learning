import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeFailure } from '../web/src/utils/errors.js';

function laceError(code: string, reason: string): Error {
  return Object.assign(new Error(''), { type: 'DAppConnectorAPIError', code, reason });
}

describe('wallet failure messages', () => {
  it('treats a Lace rejection with an empty message as rejected', () => {
    assert.deepEqual(describeFailure(laceError('Rejected', 'User rejected the transaction')), {
      phase: 'rejected',
      message: 'Lace rejected the request. No transaction was submitted.',
    });
  });

  it('lets a rejection win over secondary proof or funds details', () => {
    assert.equal(describeFailure(new Error('User cancelled while proof server fetch was pending')).phase, 'rejected');
  });

  it('surfaces non-rejection connector codes with their reason', () => {
    assert.deepEqual(describeFailure(laceError('Disconnected', 'Wallet locked')), {
      phase: 'failed',
      message: 'Lace Disconnected: Wallet locked',
    });
  });

  it('points proof failures at the local proof server and keeps the original detail', () => {
    const { phase, message } = describeFailure(new TypeError('Failed to fetch'));
    assert.equal(phase, 'failed');
    assert.match(message, /Local proof server http:\/\/localhost:6300/);
    assert.match(message, /Failed to fetch/);
  });

  it('explains missing tDUST', () => {
    assert.match(describeFailure(new Error('Insufficient DUST to cover fees')).message, /tNIGHT or tDUST/);
  });

  it('reports an unknown contract address', () => {
    assert.equal(
      describeFailure(new Error('No contract is deployed at abc on this network.')).message,
      'No counter exists at that address on Preprod. Check the address or deploy a new counter.',
    );
  });

  it('explains an indexer confirmation timeout', () => {
    assert.match(describeFailure(Object.assign(new Error('Timeout has occurred'), { name: 'TimeoutError' })).message, /within two minutes/);
  });

  it('reads the cause of wrapped errors', () => {
    assert.equal(describeFailure({ cause: new Error('Indexer unavailable') }).message, 'Indexer unavailable');
  });

  it('falls back to a generic message when nothing is readable', () => {
    assert.equal(describeFailure({}).message, 'The operation failed before confirmation.');
  });
});
