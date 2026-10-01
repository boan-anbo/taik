import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

if (process.platform !== 'darwin') {
  console.log('build:native: skip (non-darwin)');
  process.exit(0);
}

const root = process.cwd();
const src = path.join(root, 'native', 'taik-paste.swift');
const out = path.join(root, 'dist', 'native', 'taik-paste');

mkdirSync(path.dirname(out), { recursive: true });

execFileSync('swiftc', [src, '-o', out], { stdio: 'inherit' });
