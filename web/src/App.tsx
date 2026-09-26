import { useCallback, useEffect, useMemo, useState } from 'react';
import { filter, firstValueFrom, take, timeout } from 'rxjs';
import { CounterAPI, type CounterState } from '../../api/src/index';
import {
  BrowserCounterManager,
  type TransactionPhase,
  type WalletChoice,
  type WalletSession,
} from './BrowserCounterManager';
import { browserConfig } from './config';

const LACE_INSTALL_URL = 'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk';
const PREPROD_FAUCET_URL = 'https://faucet.preprod.midnight.network/';

type WalletStatus = 'detecting' | 'missing' | 'ready' | 'connecting' | 'connected';

function shortened(value: string): string {
  return value.length <= 22 ? value : `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function nestedMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return '';
  // Lace throws DApp connector APIErrors: { type: 'DAppConnectorAPIError', code, reason } with an often empty message.
  if ('type' in error && error.type === 'DAppConnectorAPIError') {
    const { code, reason } = error as { code?: unknown; reason?: unknown };
    return `Lace ${String(code ?? 'error')}: ${String(reason ?? '') || 'no reason given'}`;
  }
  if (error instanceof Error && error.message) return error.message;
  if ('cause' in error) return nestedMessage(error.cause);
  return '';
}

function friendlyError(error: unknown): { readonly phase: 'rejected' | 'failed'; readonly message: string } {
  // Errors carry no private state; log them so failures stay diagnosable from DevTools.
  console.error('[MeritVeil] operation failed', error);
  const message = nestedMessage(error);
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
  return { phase: 'failed', message: message || 'The operation failed before confirmation. See the browser console.' };
}

function phaseLabel(phase: TransactionPhase): string {
  const labels: Record<TransactionPhase, string> = {
    idle: 'Idle',
    proving: 'Generating proof',
    submitting: 'Submitting transaction',
    confirmed: 'Confirmed on Preprod',
    rejected: 'Rejected',
    failed: 'Failed',
  };
  return labels[phase];
}

export default function App() {
  const manager = useMemo(() => new BrowserCounterManager(), []);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('detecting');
  const [wallets, setWallets] = useState<readonly WalletChoice[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [session, setSession] = useState<WalletSession | null>(null);
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [contractInput, setContractInput] = useState(browserConfig.defaultContract ?? '');
  const [phase, setPhase] = useState<TransactionPhase>('idle');
  const [notice, setNotice] = useState('Connect Lace to deploy or join the private-owner counter.');

  useEffect(() => {
    manager.setPhaseListener(setPhase);
    let attempts = 0;
    const detect = () => {
      const discovered = manager.discoverWallets();
      if (discovered.length > 0) {
        setWallets(discovered);
        setSelectedWalletId((current) => current || discovered[0].id);
        setWalletStatus('ready');
        return true;
      }
      attempts += 1;
      if (attempts >= 25) setWalletStatus('missing');
      return false;
    };

    if (detect()) return undefined;
    const timer = window.setInterval(() => {
      if (detect() || attempts >= 25) window.clearInterval(timer);
    }, 200);
    return () => window.clearInterval(timer);
  }, [manager]);

  useEffect(() => {
    if (!counterApi) {
      setCounterState(null);
      return undefined;
    }
    const subscription = counterApi.state$.subscribe({
      next: setCounterState,
      error: (error: unknown) => {
        const failure = friendlyError(error);
        setPhase(failure.phase);
        setNotice(failure.message);
      },
    });
    return () => subscription.unsubscribe();
  }, [counterApi]);

  const connect = useCallback(async () => {
    if (!selectedWalletId) return;
    setWalletStatus('connecting');
    setNotice('Waiting for Lace authorization…');
    try {
      const connected = await manager.connect(selectedWalletId);
      setSession(connected);
      setWalletStatus('connected');
      setNotice('Lace connected to Preprod. Private owner material stays in this browser.');

      if (browserConfig.defaultContract) {
        const api = await manager.join(browserConfig.defaultContract);
        setCounterApi(api);
        setContractInput(api.deployedContractAddress);
      }
    } catch (error: unknown) {
      const failure = friendlyError(error);
      setPhase(failure.phase);
      setNotice(failure.message);
      setWalletStatus('ready');
    }
  }, [manager, selectedWalletId]);

  const disconnect = useCallback(() => {
    manager.disconnect();
    setSession(null);
    setCounterApi(null);
    setCounterState(null);
    setWalletStatus('ready');
    setPhase('idle');
    setNotice('Wallet state cleared. The private owner secret remains only in local browser storage.');
  }, [manager]);

  const deploy = useCallback(async () => {
    setNotice('Generating the constructor proof and deployment transaction…');
    try {
      const api = await manager.deploy();
      setCounterApi(api);
      setContractInput(api.deployedContractAddress);
      setPhase('confirmed');
      setNotice(`Counter deployed at ${api.deployedContractAddress}.`);
    } catch (error: unknown) {
      const failure = friendlyError(error);
      setPhase(failure.phase);
      setNotice(failure.message);
    }
  }, [manager]);

  const join = useCallback(async () => {
    setPhase('idle');
    setNotice('Checking the deployed counter and binding local private state…');
    try {
      const api = await manager.join(contractInput);
      setCounterApi(api);
      setContractInput(api.deployedContractAddress);
      setNotice('Counter joined. Public state is streaming from the Preprod indexer.');
    } catch (error: unknown) {
      const failure = friendlyError(error);
      setPhase(failure.phase);
      setNotice(failure.message);
    }
  }, [contractInput, manager]);

  const increment = useCallback(async () => {
    if (!counterApi || !counterState) return;
    const previousCounter = counterState.counter;
    setPhase('proving');
    setNotice('Proving ownership without revealing the secret…');

    try {
      const confirmation = firstValueFrom(
        counterApi.state$.pipe(
          filter((state) => state.counter > previousCounter),
          take(1),
          timeout({ first: 120_000 }),
        ),
      );
      await counterApi.increment();
      const confirmedState = await confirmation;
      setCounterState(confirmedState);
      setPhase('confirmed');
      setNotice('Proved ownership without revealing the secret. The indexed counter is confirmed.');
    } catch (error: unknown) {
      const failure = friendlyError(error);
      setPhase(failure.phase);
      setNotice(failure.message);
    }
  }, [counterApi, counterState]);

  const busy = phase === 'proving' || phase === 'submitting' || walletStatus === 'connecting';

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Midnight Builder Challenge · Level 2</p>
          <h1>MeritVeil Counter</h1>
        </div>
        {session ? (
          <div className="wallet-summary">
            <span className="network-dot" aria-hidden="true" />
            <span>{shortened(session.unshieldedAddress)}</span>
            <button type="button" className="text-button" onClick={disconnect}>Disconnect</button>
          </div>
        ) : null}
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
        <div className={`phase phase-${phase}`} role="status" aria-live="polite">
          <span>{phaseLabel(phase)}</span>
          {(phase === 'proving' || phase === 'submitting') ? <span className="spinner" aria-hidden="true" /> : null}
        </div>
      </section>

      {walletStatus === 'missing' ? (
        <section className="card guidance" aria-live="polite">
          <h3>Lace is required for transactions</h3>
          <p>No compatible Midnight wallet was detected. Install Lace, switch it to Preprod, and configure its proof server as Local at <code>http://localhost:6300</code>.</p>
          <a className="primary-link" href={LACE_INSTALL_URL} target="_blank" rel="noreferrer">Install Lace</a>
        </section>
      ) : null}

      {!session && walletStatus !== 'missing' ? (
        <section className="card connect-card">
          <div>
            <h3>Connect a Preprod wallet</h3>
            <p>Lace supplies wallet keys, network services, and the user-configured local proving provider.</p>
          </div>
          {wallets.length > 1 ? (
            <label>
              Wallet
              <select value={selectedWalletId} onChange={(event) => setSelectedWalletId(event.target.value)}>
                {wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}
              </select>
            </label>
          ) : null}
          <button type="button" className="primary-button" disabled={walletStatus !== 'ready'} onClick={connect}>
            {walletStatus === 'detecting' ? 'Detecting Lace…' : walletStatus === 'connecting' ? 'Connecting…' : 'Connect Lace'}
          </button>
        </section>
      ) : null}

      {session ? (
        <section className="workspace">
          <article className="card contract-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Contract</p>
                <h3>{counterApi ? 'Connected counter' : 'Choose a counter'}</h3>
              </div>
              <a href={PREPROD_FAUCET_URL} target="_blank" rel="noreferrer">Preprod faucet</a>
            </div>

            <label htmlFor="contract-address">Contract address</label>
            <input
              id="contract-address"
              value={contractInput}
              onChange={(event) => setContractInput(event.target.value)}
              placeholder="64-character Preprod contract address"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="button-row">
              <button type="button" className="secondary-button" disabled={busy || !contractInput.trim()} onClick={join}>Join</button>
              <button type="button" className="secondary-button" disabled={busy} onClick={deploy}>Deploy new</button>
            </div>
          </article>

          <article className="card counter-card">
            <p className="eyebrow">Indexed public state</p>
            <div className="counter-value" aria-label={`Counter value ${counterState?.counter ?? 0n}`}>
              {(counterState?.counter ?? 0n).toString()}
            </div>
            <p className="commitment">
              Owner commitment: {counterState ? shortened(counterState.ownerCommitment) : 'Waiting for contract state'}
            </p>
            <button
              type="button"
              className="primary-button"
              disabled={busy || !counterApi || !counterState}
              onClick={increment}
            >
              {phase === 'proving' ? 'Generating proof…' : phase === 'submitting' ? 'Submitting…' : 'Increment with private proof'}
            </button>
          </article>
        </section>
      ) : null}

      <section className="notice" aria-live="polite">
        <strong>{phaseLabel(phase)}</strong>
        <span>{notice}</span>
      </section>

      <section className="privacy-grid" aria-label="Privacy model">
        <article>
          <span>Public</span>
          <p>Counter, owner commitment, contract address, and transaction metadata.</p>
        </article>
        <article>
          <span>Private</span>
          <p>The browser-generated owner secret. It never appears in UI, logs, URLs, or ledger reads.</p>
        </article>
        <article>
          <span>Proved</span>
          <p>The increment caller knows the secret preimage for the stored commitment.</p>
        </article>
      </section>
    </main>
  );
}
