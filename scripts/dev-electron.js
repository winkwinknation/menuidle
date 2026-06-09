// Launches the real Electron GUI binary.
//
// Some host environments (notably VSCode's integrated terminal) export
// ELECTRON_RUN_AS_NODE=1, which makes `electron .` boot as plain Node — then
// require('electron') returns a path string and `app` is undefined. We delete
// that var here and spawn the binary ourselves so the app window actually opens.
const { spawn } = require('child_process');

// Under Node, require('electron') resolves to the path of the Electron binary.
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
if (args.length === 0) args.push('.');

const child = spawn(electronPath, args, { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to launch Electron:', err);
  process.exit(1);
});
