/**
 * Packages the built game (dist/) as a Windows desktop app with Electron:
 * release/Packbound-win32-x64/Packbound.exe, plus a zip of that folder.
 * Run with `npm run dist:win` (works from Windows, macOS or Linux).
 */
import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const out = 'release';
const [dir] = await packager({
  dir: '.',
  out,
  name: 'Packbound',
  executableName: 'Packbound',
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: true,
  prune: false,
  // Only the built game and the window script go into the app.
  ignore: (p) => !(p === '' || p === '/package.json' || p.startsWith('/dist') || p.startsWith('/electron')),
});
console.log(`Packaged: ${dir}/Packbound.exe`);
const zip = `${out}/Packbound-win32-x64.zip`;
if (existsSync(zip)) rmSync(zip);
try {
  execFileSync('zip', ['-qr', '../Packbound-win32-x64.zip', '.'], { cwd: dir });
  console.log(`Zipped: ${zip}`);
} catch {
  console.log('zip is not installed: share the folder above instead.');
}
