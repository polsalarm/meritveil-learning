import type { PendingAction } from '../hooks/useMidnight';

const PREPROD_FAUCET_URL = 'https://faucet.preprod.midnight.network/';

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
        <label htmlFor="contract-address">Contract address</label>
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
