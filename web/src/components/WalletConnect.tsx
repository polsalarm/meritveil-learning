import type { WalletChoice, WalletSession, WalletStatus } from '../hooks/useMidnight';
import { shortened } from '../utils/format';

const LACE_INSTALL_URL = 'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk';

interface WalletConnectProps {
  readonly walletStatus: WalletStatus;
  readonly wallets: readonly WalletChoice[];
  readonly selectedWalletId: string;
  readonly session: WalletSession | null;
  readonly onSelectWallet: (walletId: string) => void;
  readonly onConnect: () => void;
}

/** Wallet discovery, installation guidance, and the Lace connect action. Renders nothing once connected. */
export function WalletConnect({
  walletStatus,
  wallets,
  selectedWalletId,
  session,
  onSelectWallet,
  onConnect,
}: WalletConnectProps) {
  if (session) return null;

  if (walletStatus === 'missing') {
    return (
      <section className="card guidance" aria-labelledby="wallet-missing-title">
        <h3 id="wallet-missing-title">Lace is required for transactions</h3>
        <p>
          No compatible Midnight wallet was detected. Install Lace, switch it to Preprod, and configure its proof
          server as Local at <code>http://localhost:6300</code>. Then reload this page.
        </p>
        <a className="primary-link" href={LACE_INSTALL_URL} target="_blank" rel="noreferrer">Install Lace</a>
      </section>
    );
  }

  return (
    <section className="card connect-card" aria-labelledby="wallet-connect-title">
      <div>
        <h3 id="wallet-connect-title">Connect a Preprod wallet</h3>
        <p>Lace supplies wallet keys, network services, and the user-configured local proving provider.</p>
      </div>
      {wallets.length > 1 ? (
        <label>
          Wallet
          <select value={selectedWalletId} onChange={(event) => onSelectWallet(event.target.value)}>
            {wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        className="primary-button"
        disabled={walletStatus !== 'ready'}
        aria-busy={walletStatus === 'connecting'}
        onClick={onConnect}
      >
        {walletStatus === 'detecting' ? 'Detecting Lace…' : walletStatus === 'connecting' ? 'Connecting…' : 'Connect Lace'}
      </button>
    </section>
  );
}

interface WalletBadgeProps {
  readonly session: WalletSession;
  readonly onDisconnect: () => void;
}

/** Connected wallet address and the disconnect action shown in the header. */
export function WalletBadge({ session, onDisconnect }: WalletBadgeProps) {
  return (
    <div className="wallet-summary">
      <span className="network-dot" aria-hidden="true" />
      <span title={session.unshieldedAddress}>
        <span className="visually-hidden">Connected Preprod address </span>
        {shortened(session.unshieldedAddress)}
      </span>
      <button type="button" className="text-button" onClick={onDisconnect}>Disconnect</button>
    </div>
  );
}
