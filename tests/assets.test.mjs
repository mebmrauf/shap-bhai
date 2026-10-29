import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('every Bangla reaction ships with non-empty PCM audio and its script',async()=>{
  const base=new URL('../web/audio/',import.meta.url);const credits=JSON.parse(await readFile(new URL('credits.json',base),'utf8'));
  for(const [name,text] of Object.entries(credits.lines)){
    assert.match(text,/[\u0980-\u09ff]/);const bytes=await readFile(new URL(`${name}.wav`,base));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');assert.ok(bytes.length>10000);
    let offset=12,data=null;while(offset+8<bytes.length){const id=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4);if(id==='data'){data=bytes.subarray(offset+8,offset+8+length);break;}offset+=8+length+(length%2);}
    assert.ok(data?.length>10000);let peak=0;for(let i=0;i<data.length-1;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));assert.ok(peak>500,`${name} must not be silent`);
  }
});
test('pungi loop ships as audible PCM with attribution and a smooth wrap', async () => {
  const base = new URL('../web/audio/', import.meta.url);
  const credits = JSON.parse(await readFile(new URL('credits.json', base), 'utf8'));
  assert.equal(credits.music.creator, 'Ktorrespr');
  assert.equal(credits.music.license, 'CC BY-SA 4.0');
  assert.match(await readFile(new URL('PUNGI-LICENSE.md', base), 'utf8'), /creativecommons.org\/licenses\/by-sa\/4.0/);
  const bytes = await readFile(new URL('pungi-loop.wav', base));
  let data, format;
  for (let offset = 12; offset + 8 < bytes.length;) {
    const id = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    if (id === 'data') data = bytes.subarray(offset + 8, offset + 8 + size);
    if (id === 'fmt ') format = bytes.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  assert.equal(format.readUInt16LE(0), 1); assert.equal(format.readUInt16LE(2), 1);
  assert.equal(format.readUInt32LE(4), 24000); assert.equal(format.readUInt16LE(14), 16);
  assert.ok(Math.abs(data.length / 48000 - 13.35) < .05);
  let peak = 0, maxStep = 0;
  for (let i = 2; i < data.length; i += 2) {
    peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
    maxStep = Math.max(maxStep, Math.abs(data.readInt16LE(i) - data.readInt16LE(i - 2)));
  }
  assert.ok(peak > 500);
  assert.ok(Math.abs(data.readInt16LE(0) - data.readInt16LE(data.length - 2)) < maxStep / 2);
});
