import { Buffer } from 'buffer';

Object.defineProperty(globalThis, 'Buffer', {
  configurable: true,
  writable: true,
  value: Buffer,
});
