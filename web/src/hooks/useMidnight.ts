import { useCallback, useEffect, useMemo, useState } from 'react';
import { filter, firstValueFrom, take, timeout } from 'rxjs';
import type { CounterAPI, CounterState } from '../../../api/src/index';
import {
  BrowserCounterManager,
  type TransactionPhase,
  type WalletChoice,
  type WalletSession,
} from '../BrowserCounterManager';
import { browserConfig } from '../config';
import { describeFailure } from '../utils/errors';

export type WalletStatus = 'detecting' | 'missing' | 'ready' | 'connecting' | 'connected';
export type PendingAction = 'deploy' | 'join' | 'increment' | null;
export type { TransactionPhase, WalletChoice, WalletSession };

const WALLET_DETECTION_ATTEMPTS = 25;
const WALLET_DETECTION_INTERVAL_MS = 200;
const CONFIRMATION_TIMEOUT_MS = 120_000;

/** Owns wallet discovery, the Lace session, the joined counter, and every transaction state shown in the UI. */
export function useMidnight() {
  const manager = useMemo(() => new BrowserCounterManager(), []);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('detecting');
  const [wallets, setWallets] = useState<readonly WalletChoice[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [session, setSession] = useState<WalletSession | null>(null);
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [contractInput, setContractInput] = useState(browserConfig.defaultContract ?? '');
  const [phase, setPhase] = useState<TransactionPhase>('idle');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [provedWithoutRevealing, setProvedWithoutRevealing] = useState(false);
  const [notice, setNotice] = useState('Connect Lace to deploy or join the private-owner counter.');

  const fail = useCallback((error: unknown) => {
    // Development-only diagnostics keep production consoles clean; errors never contain private state.
    if (import.meta.env.DEV) console.error('[MeritVeil] operation failed', error);
    const failure = describeFailure(error);
    setPhase(failure.phase);
    setNotice(failure.message);
  }, []);

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
      if (attempts >= WALLET_DETECTION_ATTEMPTS) setWalletStatus('missing');
      return false;
    };

    if (detect()) return undefined;
    const timer = window.setInterval(() => {
      if (detect() || attempts >= WALLET_DETECTION_ATTEMPTS) window.clearInterval(timer);
    }, WALLET_DETECTION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [manager]);

  useEffect(() => {
    if (!counterApi) {
      setCounterState(null);
      return undefined;
    }
    const subscription = counterApi.state$.subscribe({ next: setCounterState, error: fail });
    return () => subscription.unsubscribe();
  }, [counterApi, fail]);

  const bindCounter = useCallback((api: CounterAPI) => {
    setCounterApi(api);
    setContractInput(api.deployedContractAddress);
    setProvedWithoutRevealing(false);
  }, []);

  const connect = useCallback(async () => {
    if (!selectedWalletId) return;
    setWalletStatus('connecting');
    setPhase('idle');
    setNotice('Waiting for Lace authorization…');
    try {
      const connected = await manager.connect(selectedWalletId);
      setSession(connected);
      setWalletStatus('connected');
      setNotice('Lace connected to Preprod. Private owner material stays in this browser.');

      if (browserConfig.defaultContract) {
        setPendingAction('join');
        bindCounter(await manager.join(browserConfig.defaultContract));
        setNotice('Lace connected and the published Preprod counter joined.');
      }
    } catch (error: unknown) {
      fail(error);
      setWalletStatus((status) => (status === 'connecting' ? 'ready' : status));
    } finally {
      setPendingAction(null);
    }
  }, [bindCounter, fail, manager, selectedWalletId]);

  const disconnect = useCallback(() => {
    manager.disconnect();
    setSession(null);
    setCounterApi(null);
    setCounterState(null);
    setProvedWithoutRevealing(false);
    setPendingAction(null);
    setWalletStatus('ready');
    setPhase('idle');
    setNotice('Wallet state cleared. The private owner secret remains only in local browser storage.');
  }, [manager]);

  const deploy = useCallback(async () => {
    setPendingAction('deploy');
    setNotice('Generating the constructor proof and deployment transaction…');
    try {
      const api = await manager.deploy();
      bindCounter(api);
      setPhase('confirmed');
      setNotice(`Counter deployed at ${api.deployedContractAddress}.`);
    } catch (error: unknown) {
      fail(error);
    } finally {
      setPendingAction(null);
    }
  }, [bindCounter, fail, manager]);

  const join = useCallback(async () => {
    setPendingAction('join');
    setPhase('idle');
    setNotice('Checking the deployed counter and binding local private state…');
    try {
      bindCounter(await manager.join(contractInput));
      setNotice('Counter joined. Public state is streaming from the Preprod indexer.');
    } catch (error: unknown) {
      fail(error);
    } finally {
      setPendingAction(null);
    }
  }, [bindCounter, contractInput, fail, manager]);

  const increment = useCallback(async () => {
    if (!counterApi || !counterState) return;
    const previousCounter = counterState.counter;
    setPendingAction('increment');
    setProvedWithoutRevealing(false);
    setPhase('proving');
    setNotice('Proving ownership without revealing the secret…');

    try {
      const confirmation = firstValueFrom(
        counterApi.state$.pipe(
          filter((state) => state.counter > previousCounter),
          take(1),
          timeout({ first: CONFIRMATION_TIMEOUT_MS }),
        ),
      );
      await counterApi.increment();
      setCounterState(await confirmation);
      setPhase('confirmed');
      setProvedWithoutRevealing(true);
      setNotice('Ownership proved without revealing your input. The indexed counter is confirmed.');
    } catch (error: unknown) {
      fail(error);
    } finally {
      setPendingAction(null);
    }
  }, [counterApi, counterState, fail]);

  return {
    walletStatus,
    wallets,
    selectedWalletId,
    setSelectedWalletId,
    session,
    counterApi,
    counterState,
    contractInput,
    setContractInput,
    phase,
    pendingAction,
    provedWithoutRevealing,
    notice,
    busy: pendingAction !== null || walletStatus === 'connecting',
    connect,
    disconnect,
    deploy,
    join,
    increment,
  };
}
