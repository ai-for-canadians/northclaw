#!/usr/bin/env node
/**
 * esbuild script for the NorthClaw dashboard UI.
 * Bundles src/dashboard/ui/app.tsx → src/dashboard/ui/dist/app.js
 * and copies index.html to dist/.
 */

import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');

fs.mkdirSync(distDir, { recursive: true });

// Copy index.html
fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(distDir, 'index.html'));

await esbuild.build({
  entryPoints: [path.join(__dirname, 'app.tsx')],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['esnext'],
  outfile: path.join(distDir, 'app.js'),
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
});

console.log('Dashboard UI built → src/dashboard/ui/dist/');
