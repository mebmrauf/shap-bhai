// Dev-only: renders missing Bangla lines. Needs edge-tts and ffmpeg on PATH.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const base = fileURLToPath(new URL('../web/audio/', import.meta.url));
const { lines } = JSON.parse(readFileSync(join(base, 'credits.json'), 'utf8'));
const temp = mkdtempSync(join(tmpdir(), 'snake-voices-'));
try {
  for (const [name, text] of Object.entries(lines)) {
    const out = join(base, `${name}.mp3`);
    if (existsSync(out)) continue;
    const voice = /^(roast|chaos)/.test(name) ? 'bn-BD-NabanitaNeural' : 'bn-BD-PradeepNeural', mp3 = join(temp, `${name}.raw.mp3`);
    // The speech service occasionally returns no audio for a valid request.
    for (let attempt = 0; ; attempt++) {
      try { execFileSync('edge-tts', ['--voice', voice, '--text', text, '--write-media', mp3], { stdio: 'pipe', timeout: 45000 }); break; }
      catch (error) { if (attempt >= 4) throw error; await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); }
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2', '-ac', '1', '-ar', '24000', '-id3v2_version', '0', '-c:a', 'libmp3lame', '-b:a', '64k', out], { stdio: 'pipe' });
    console.log(`${name}: ${text}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }
