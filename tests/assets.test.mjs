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
