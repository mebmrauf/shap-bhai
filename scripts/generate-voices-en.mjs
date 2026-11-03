// Dev-only: renders missing English lines from web/audio/credits-en.json. Needs edge-tts and ffmpeg on PATH.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('../web/audio/en/', import.meta.url));
mkdirSync(base, { recursive: true });
const { lines } = JSON.parse(readFileSync(fileURLToPath(new URL('../web/audio/credits-en.json', import.meta.url)), 'utf8'));
const temp = mkdtempSync(join(tmpdir(), 'snake-voices-en-'));

try {
  for (const [name, text] of Object.entries(lines)) {
    const out = join(base, `${name}.mp3`);
    if (existsSync(out)) continue;
    const voice = /^(roast|chaos)/.test(name) ? 'en-US-JennyNeural' : 'en-US-GuyNeural';
    const mp3 = join(temp, `${name}.raw.mp3`);
    execFileSync('edge-tts', ['--voice', voice, '--text', text, '--write-media', mp3], { stdio: 'pipe' });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '24000', '-id3v2_version', '0', '-c:a', 'libmp3lame', '-b:a', '64k', out], { stdio: 'pipe' });
    console.log(`${name}: ${text}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

