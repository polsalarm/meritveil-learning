import { WebSocket } from 'ws';

// @polkadot/x-ws captures globalThis.WebSocket when its module is evaluated.
// Node 22 provides an Undici implementation that Preview closes during
// submitAndWatchExtrinsic, so install the supported `ws` implementation before
// any Midnight SDK module loads.
Object.defineProperty(globalThis, 'WebSocket', {
  configurable: true,
  writable: true,
  value: WebSocket,
});
