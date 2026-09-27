import type { CounterState } from '../../../api/src/index';
import type { TransactionPhase } from '../hooks/useMidnight';
import { shortened } from '../utils/format';

interface CircuitCallProps {
  readonly counterState: CounterState | null;
  readonly phase: TransactionPhase;
  readonly disabled: boolean;
  readonly provedWithoutRevealing: boolean;
  readonly onIncrement: () => void;
}

/** Calls the `increment` circuit with a locally generated proof and shows the indexed on-chain result. */
export function CircuitCall({ counterState, phase, disabled, provedWithoutRevealing, onIncrement }: CircuitCallProps) {
  const counter = counterState?.counter ?? 0n;
  return (
    <article className="card counter-card" aria-labelledby="counter-title">
      <p className="eyebrow" id="counter-title">Indexed public state</p>
      <output className="counter-value" aria-live="polite" aria-label={`Counter value ${counter}`}>
        {counter.toString()}
      </output>
      <p className="commitment">
        Owner commitment: {counterState ? shortened(counterState.ownerCommitment) : 'Waiting for contract state'}
      </p>
      {provedWithoutRevealing ? (
        <p className="proof-badge" role="status">
          <span aria-hidden="true">✓</span> Proved without revealing your input
        </p>
      ) : null}
      <button type="button" className="primary-button" disabled={disabled} aria-busy={phase === 'proving' || phase === 'submitting'} onClick={onIncrement}>
        {phase === 'proving' ? 'Generating proof…' : phase === 'submitting' ? 'Submitting…' : 'Increment with private proof'}
      </button>
    </article>
  );
}
