import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function buildId(root) {
  const hash = createHash('sha256');
  for (const name of fs.readdirSync(root, { recursive: true }).map(String).sort()) {
    const file = path.join(root, name);
    if (fs.statSync(file).isFile() && name !== 'sw.js' && !path.basename(name).startsWith('.')) hash.update(name).update(fs.readFileSync(file));
  }
  return hash.digest('hex').slice(0, 12);
}
