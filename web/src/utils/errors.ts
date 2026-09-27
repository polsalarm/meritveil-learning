export interface Failure {
  readonly phase: 'rejected' | 'failed';
  readonly message: string;
}

/** Extracts the most specific human-readable text from wallet, SDK, and RxJS errors. */
export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return '';
  // Lace throws DApp connector APIErrors: { type: 'DAppConnectorAPIError', code, reason } with an often empty message.
  if ('type' in error && error.type === 'DAppConnectorAPIError') {
    const { code, reason } = error as { code?: unknown; reason?: unknown };
    return `Lace ${String(code ?? 'error')}: ${String(reason ?? '') || 'no reason given'}`;
  }
  if (error instanceof Error && error.message) return error.message;
  if ('cause' in error) return errorMessage(error.cause);
  return '';
}

/**
 * Maps a failure to the transaction phase and the actionable message shown to the user.
 * Order matters: a user rejection wins over any secondary proof, funds, or network detail.
 */
export function describeFailure(error: unknown): Failure {
  const message = errorMessage(error);
  if (/reject|denied|cancel/i.test(message)) {
    return { phase: 'rejected', message: 'Lace rejected the request. No transaction was submitted.' };
  }
  if (/proof|prover|fetch/i.test(message)) {
    return {
      phase: 'failed',
      message: `Proof generation failed. Confirm Lace uses Local proof server http://localhost:6300. (${message})`,
    };
  }
  if (/insufficient|dust|balance/i.test(message)) {
    return { phase: 'failed', message: `Insufficient Preprod tNIGHT or tDUST for this transaction. (${message})` };
  }
  if (/no contract is deployed/i.test(message)) {
    return { phase: 'failed', message: 'No counter exists at that address on Preprod. Check the address or deploy a new counter.' };
  }
  if (/timeout/i.test(message)) {
    return { phase: 'failed', message: 'The transaction was not confirmed by the indexer within two minutes. Check Lace activity, then retry.' };
  }
  return { phase: 'failed', message: message || 'The operation failed before confirmation.' };
}
