// Polling-based dev runner for the Fase 1 bootstrap server.
//
// Why: native fs-event watchers (e.g. `node --watch`) rely on inotify,
// which does not reliably propagate through Docker Desktop's bind-mount
// backend on macOS/Windows — edits on the host land in the container
// (the bind mount itself is instant), but the watcher never fires.
// `fs.watchFile` polls mtime instead, so it works the same on every host.
// Fase 2 must apply the equivalent for Next.js (`next dev` with
// WATCHPACK_POLLING=true) for the same reason.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'server.js');

let child = spawnServer();

function spawnServer() {
  return spawn(process.execPath, [target], { stdio: 'inherit' });
}

fs.watchFile(target, { interval: 300 }, () => {
  console.log('[dev] server.js changed, restarting...');
  child.kill();
  child = spawnServer();
});
