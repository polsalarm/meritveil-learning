import { useEffect, useState } from 'react';
import type { PendingAction } from '../hooks/useMidnight';

const PREPROD_FAUCET_URL = 'https://faucet.preprod.midnight.network/';
const COPIED_FEEDBACK_MS = 1600;

interface ContractPanelProps {
  readonly joined: boolean;
  readonly contractInput: string;
  readonly busy: boolean;
  readonly pendingAction: PendingAction;
  readonly onContractInput: (value: string) => void;
  readonly onJoin: () => void;
  readonly onDeploy: () => void;
}

/** Chooses the counter: join an existing Preprod address or deploy a new one bound to this browser's secret. */
export function ContractPanel({
  joined,
  contractInput,
  busy,
  pendingAction,
  onContractInput,
  onJoin,
  onDeploy,
}: ContractPanelProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <article className="card contract-card" aria-labelledby="contract-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Contract</p>
          <h3 id="contract-title">{joined ? 'Connected counter' : 'Choose a counter'}</h3>
        </div>
        <a href={PREPROD_FAUCET_URL} target="_blank" rel="noreferrer">Preprod faucet</a>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && contractInput.trim()) onJoin();
        }}
      >
        <div className="label-row">
          <label htmlFor="contract-address">Contract address</label>
          {joined ? (
            <button
              type="button"
              className="text-button"
              onClick={() => navigator.clipboard.writeText(contractInput.trim()).then(() => setCopied(true), () => undefined)}
            >
              {copied ? 'Copied ✓' : 'Copy address'}
            </button>
          ) : null}
        </div>
        <input
          id="contract-address"
          value={contractInput}
          onChange={(event) => onContractInput(event.target.value)}
          placeholder="64-character Preprod contract address"
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
          aria-describedby="contract-help"
        />
        <p id="contract-help" className="field-help">
          Deploy new binds the counter to a fresh secret kept only in this browser. Only that browser can increment it.
        </p>
        <div className="button-row">
          <button type="submit" className="secondary-button" disabled={busy || !contractInput.trim()} aria-busy={pendingAction === 'join'}>
            {pendingAction === 'join' ? 'Joining…' : 'Join'}
          </button>
          <button type="button" className="secondary-button" disabled={busy} aria-busy={pendingAction === 'deploy'} onClick={onDeploy}>
            {pendingAction === 'deploy' ? 'Deploying…' : 'Deploy new'}
          </button>
        </div>
      </form>
    </article>
  );
}
