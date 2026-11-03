import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { t, num, lang, translationKeys } from '../web/js/i18n.js';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
test('Bangla is the default, numbers included', () => {
  assert.equal(lang(), 'bn'); assert.equal(num(47), '৪৭');
  assert.equal(t('Play again'), 'আবার খেলো');
  assert.equal(t('TARGET {n}', { n: 12 }), 'লক্ষ্য ১২');
});
test('an unknown string falls back to readable text instead of breaking', () => assert.equal(t('Brand new text'), 'Brand new text'));
test('every string the app asks to translate has Bangla', async () => {
  const keys = new Set(translationKeys()), app = await read('../web/js/app.js');
  const used = [...app.matchAll(/\bt\((?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)].map(m => (m[1] ?? m[2]).replace(/\\n/g, '\n').replace(/\\'/g, "'"));
  assert.ok(used.length > 70);
  assert.deepEqual([...new Set(used)].filter(key => !keys.has(key)), []);
});
test('templated text is always given its values', async () => {
  const app = await read('../web/js/app.js');
  assert.deepEqual(app.match(/\bt\((?:'[^'\n]*\{\w+\}[^'\n]*'|"[^"\n]*\{\w+\}[^"\n]*")\)/g) ?? [], []);
});
test('no player-facing sentence reaches the screen untranslated', async () => {
  const app = await read('../web/js/app.js');
  const bare = app.split('\n').filter(line => !/^const (CARD_NOTES|CHAOS_STATUS|OFFLINE_ROOM|DEATH_SENTENCE)|^import /.test(line)).flatMap(line => line.match(/(?:overlay|error|say|playLabel)\(['"][A-Z][^'"]+['"]/g) ?? []);
  assert.deepEqual(bare, []);
});
test('every snake is free from the start', async () => {
  const { SKINS } = await import('../web/js/themes.js');
  assert.equal(Object.keys(SKINS).length, 5);
  for (const skin of Object.values(SKINS)) assert.equal(skin.unlock, undefined);
  assert.equal((await read('../web/js/app.js')).includes('option.disabled'), false);
});
test('placeholders survive translation', async () => {
  const source = await read('../web/js/i18n.js');
  const names = text => (text.match(/\{\w+\}/g) ?? []).sort().join();
  for (const key of translationKeys()) if (key.includes('{')) assert.equal(names(t(key, {})) , '', key);
  for (const [, key, value] of source.matchAll(/'([^'\n]*\{\w+\}[^'\n]*)': '([^'\n]*)'/g)) assert.equal(names(value), names(key), key);
});
test('every player-facing label on the page and in the menus has Bangla', async () => {
  const keys = new Set(translationKeys()), html = await read('../web/index.html'), themes = await read('../web/js/themes.js');
  const body = html.slice(html.indexOf('<body>')).replace(/<dialog id="studyDialog"[\s\S]*?<\/dialog>/, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<noscript>[\s\S]*?<\/noscript>/, '');
  const texts = [...body.matchAll(/>([^<>]+)</g)].map(m => m[1].trim().replace(/&amp;/g, '&')).filter(text => /[A-Za-z]{3}/.test(text));
  const ignored = new Set(['W A S D', 'Esc', 'bmrauf.me', 'Nagin Been music · Rajhans Raju', 'English', '· edited loop', 'Original Bangla reactions. A little rhythm. Your call.', 'CLASSIC']);
  assert.deepEqual(texts.filter(text => !keys.has(text) && !ignored.has(text) && !/[ঀ-৿]/.test(text)), []);
  for (const [, label] of themes.matchAll(/label: "?'?([^'",]+)['"],/g)) assert.ok(keys.has(label), label);
});
