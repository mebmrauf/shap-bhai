import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildId } from './build-id.mjs';
const source = new URL('../web/', import.meta.url), output = new URL('../dist/', import.meta.url);
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });
const worker = new URL('sw.js', output);
fs.writeFileSync(worker, fs.readFileSync(worker, 'utf8').replace('__BUILD__', buildId(fileURLToPath(source))));
console.log('Static game built in dist/ with a content-versioned offline cache.');
