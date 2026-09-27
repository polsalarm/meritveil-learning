import { CircuitCall } from './components/CircuitCall';
import { ContractPanel } from './components/ContractPanel';
import { WalletBadge, WalletConnect } from './components/WalletConnect';
import { StepTracker } from './components/StepTracker';
import { useMidnight, type TransactionPhase } from './hooks/useMidnight';

const PHASE_LABELS: Record<TransactionPhase, string> = {
  idle: 'Idle',
  proving: 'Generating proof',
  submitting: 'Submitting transaction',
  confirmed: 'Confirmed on Preprod',
  rejected: 'Rejected',
  failed: 'Failed',
};

export default function App() {
  const midnight = useMidnight();
  const { phase, session } = midnight;
  const inFlight = phase === 'proving' || phase === 'submitting';

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Midnight Builder Challenge</p>
          <h1>MeritVeil Counter</h1>
        </div>
        {session ? <WalletBadge session={session} onDisconnect={midnight.disconnect} /> : null}
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Private witness · public result</p>
          <h2>Prove control. Increment publicly.</h2>
          <p className="lede">
            The browser proves knowledge of a private owner secret. Preprod receives only the owner commitment,
            transaction metadata, and the confirmed counter value.
          </p>
        </div>
        <div className={`phase phase-${phase}`} aria-hidden="true">
          <span>{PHASE_LABELS[phase]}</span>
          {inFlight ? <span className="spinner" /> : null}
        </div>
      </section>

      <StepTracker
        connected={session !== null}
        joined={midnight.counterApi !== null}
        proving={inFlight}
        proved={midnight.provedWithoutRevealing}
      />

      <WalletConnect
        walletStatus={midnight.walletStatus}
        wallets={midnight.wallets}
        selectedWalletId={midnight.selectedWalletId}
        session={session}
        onSelectWallet={midnight.setSelectedWalletId}
        onConnect={midnight.connect}
      />

      {session ? (
        <section className="workspace" aria-busy={midnight.busy}>
          <ContractPanel
            joined={midnight.counterApi !== null}
            contractInput={midnight.contractInput}
            busy={midnight.busy}
            pendingAction={midnight.pendingAction}
            onContractInput={midnight.setContractInput}
            onJoin={midnight.join}
            onDeploy={midnight.deploy}
          />
          <CircuitCall
            counterState={midnight.counterState}
            phase={phase}
            disabled={midnight.busy || !midnight.counterApi || !midnight.counterState}
            provedWithoutRevealing={midnight.provedWithoutRevealing}
            onIncrement={midnight.increment}
          />
        </section>
      ) : null}

      <section className={`notice notice-${phase}`} role="status" aria-live="polite">
        <strong>{PHASE_LABELS[phase]}</strong>
        <span>{midnight.notice}</span>
      </section>

      <section className="privacy-grid" aria-label="Privacy model">
        <article>
          <span>Public</span>
          <p>Counter, owner commitment, contract address, and transaction metadata.</p>
        </article>
        <article>
          <span>Private</span>
          <p>The browser-generated owner secret. It never appears in the UI, console, URLs, analytics, or ledger reads.</p>
        </article>
        <article>
          <span>Proved</span>
          <p>The increment caller knows the secret whose hash equals the stored commitment — without revealing it.</p>
        </article>
      </section>
    </main>
  );
}
