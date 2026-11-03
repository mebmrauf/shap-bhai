import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
test('every Bangla reaction ships as an MP3 with its script, and the offline cache lists it',async()=>{
  const base=new URL('../web/audio/',import.meta.url);const credits=JSON.parse(await readFile(new URL('credits.json',base),'utf8'));
  const worker=await readFile(new URL('../web/sw.js',import.meta.url),'utf8');
  for(const [name,text] of Object.entries(credits.lines)){
    assert.match(text,/[\u0980-\u09ff]/);const bytes=await readFile(new URL(`${name}.mp3`,base));
    assert.equal(bytes[0],0xff,`${name} must start on an MP3 frame`);assert.equal(bytes[1]&0xe0,0xe0);assert.ok(bytes.length>1500,`${name} is too short`);
    assert.ok(worker.includes(`'${name}'`),`${name} must be cached for offline play`);
  }
});
test('every English reaction ships as an MP3 with its script, and the offline cache lists it', async () => {
  const base = new URL('../web/audio/', import.meta.url); const credits = JSON.parse(await readFile(new URL('credits-en.json', base), 'utf8'));
  const worker = await readFile(new URL('../web/sw.js', import.meta.url), 'utf8');
  for (const [name, text] of Object.entries(credits.lines)) {
    assert.match(text, /[A-Za-z]/); const bytes = await readFile(new URL(`en/${name}.mp3`, base));
    assert.equal(bytes[0], 0xff, `${name} must start on an MP3 frame`); assert.equal(bytes[1] & 0xe0, 0xe0); assert.ok(bytes.length > 1500, `${name} is too short`);
    assert.ok(worker.includes(`'${name}'`), `${name} must be cached for offline play`);
  }
});
test('the offline cache lists every script the app loads',async()=>{
  const worker=await readFile(new URL('../web/sw.js',import.meta.url),'utf8');
  for(const file of await readdir(new URL('../web/js/',import.meta.url)))assert.ok(worker.includes(`/js/${file}`),`${file} must be cached for offline play`);
  assert.ok(worker.includes('/vendor/three-0.187.0-r2/three.min.js'));
});
test('pungi loop ships as audible PCM with attribution and a smooth wrap', async () => {
  const base = new URL('../web/audio/', import.meta.url);
  const credits = JSON.parse(await readFile(new URL('credits.json', base), 'utf8'));
  assert.equal(credits.music.sourceVideoId, 'Gs7qKgMGgT4');
  assert.equal(credits.music.uploader, 'Rajhans Raju');
  assert.match(credits.music.license, /redistribution rights unverified/);
  assert.match(await readFile(new URL('PUNGI-LICENSE.md', base), 'utf8'), /Redistribution rights are unverified/);
  const bytes = await readFile(new URL('pungi-loop.wav', base));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), credits.music.sha256);
  let data, format;
  for (let offset = 12; offset + 8 < bytes.length;) {
    const id = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (id === 'data') data = bytes.subarray(offset + 8, offset + 8 + size);
    if (id === 'fmt ') format = bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  assert.equal(format.readUInt16LE(0), 1); assert.equal(format.readUInt16LE(2), 1);
  assert.equal(format.readUInt32LE(4), 24000); assert.equal(format.readUInt16LE(14), 16);
  assert.ok(Math.abs(data.length / 48000 - credits.music.durationSeconds) < .05);
  let peak = 0, maxStep = 0;
  for (let i = 2; i < data.length; i += 2) {
    peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
    maxStep = Math.max(maxStep, Math.abs(data.readInt16LE(i) - data.readInt16LE(i - 2)));
  }
  assert.ok(peak > 500);
  assert.ok(Math.abs(data.readInt16LE(0) - data.readInt16LE(data.length - 2)) < maxStep / 2);
});
