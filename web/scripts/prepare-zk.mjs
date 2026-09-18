import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const generatedRoot = fileURLToPath(new URL('../../managed/counter/', import.meta.url));
const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));

for (const directory of ['keys', 'zkir']) {
  const destination = `${publicRoot}${directory}`;
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(`${generatedRoot}${directory}`, destination, { recursive: true });
}

console.log(`Prepared counter ZK assets in ${workspaceRoot}public`);
