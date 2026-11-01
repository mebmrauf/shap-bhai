import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cardMood, cardCopy, grade, shareSentence, digits, CARD_STYLES } from '../web/js/cards.js';
const MOODS = ['best', 'zero', 'wall', 'self', 'traffic', 'full'];
const texts = value => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(texts) : value && typeof value === 'object' ? Object.values(value).flatMap(texts) : [];
test('a card matches how the run actually went', () => {
  assert.equal(cardMood({ reason: 'wall', score: 3 }), 'wall');
  assert.equal(cardMood({ reason: 'self', score: 9 }), 'self');
  assert.equal(cardMood({ reason: 'traffic', score: 2 }), 'traffic');
  assert.equal(cardMood({ reason: 'wall', score: 0 }), 'zero');
  assert.equal(cardMood({ reason: 'wall', score: 30, newBest: true }), 'best');
  assert.equal(cardMood({ reason: 'wall', score: 0, newBest: true }), 'zero');
  assert.equal(cardMood({ reason: 'board-full', score: 390 }), 'full');
});
test('every design has complete text for every outcome, in both languages', () => {
  for (const style of CARD_STYLES) for (const mood of MOODS) for (const lang of ['bn', 'en']) {
    const copy = cardCopy(style, { score: 47, apples: 40, theme: 'coxs', mood, lang });
    for (const text of texts(copy)) { assert.ok(text.length > 0, `${style}/${mood}/${lang}`); assert.equal(/undefined|NaN|\[object/.test(text), false, text); }
  }
});
test('Bangla cards use Bangla digits, English cards do not', () => {
  assert.equal(digits(47, 'bn'), '৪৭'); assert.equal(digits(47, 'en'), '47');
  assert.equal(cardCopy('wanted', { score: 47, mood: 'wall', lang: 'bn' }).score, '৪৭');
  assert.equal(cardCopy('wanted', { score: 47, mood: 'wall', lang: 'en' }).score, '47');
  assert.equal(cardCopy('marksheet', { score: 47, mood: 'best', lang: 'bn' }).gpa, '৫.০০');
});
test('the marksheet fails exactly the subject that killed the snake', () => {
  const marks = mood => Object.fromEntries(cardCopy('marksheet', { score: 15, mood, lang: 'en' }).rows);
  assert.equal(marks('wall')['Recognising walls'], 'F'); assert.equal(marks('self')['Tail management'], 'F'); assert.equal(marks('traffic')['Avoiding buses'], 'F');
  assert.equal(marks('self')['Recognising walls'], 'A');
  assert.equal(marks('wall')['Hiding from Mom'], 'A+');
});
test('grades and the stamp follow the score', () => {
  assert.equal(grade(0).pass, false); assert.equal(grade(4).letter, 'F'); assert.equal(grade(5).pass, true); assert.equal(grade(40).letter, 'A+');
  assert.match(cardCopy('marksheet', { score: 2, mood: 'wall', lang: 'en' }).stamp, /FAILED/);
  assert.match(cardCopy('marksheet', { score: 30, mood: 'wall', lang: 'bn' }).stamp, /পাস/);
});
test('the caption names the food and the ending', () => {
  assert.equal(shareSentence({ apples: 7, theme: 'dhaka', mood: 'traffic', lang: 'en' }), 'My snake ate 7 fuchka and crashed into a bus. Can you beat it?');
  assert.match(shareSentence({ apples: 7, theme: 'coxs', mood: 'self', lang: 'bn' }), /৭টা ইলিশ.*লেজ/);
});
test('the developer is credited on the page and on every card', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8'), cards = await readFile(new URL('../web/js/cards.js', import.meta.url), 'utf8');
  assert.match(html, /href="https:\/\/bmrauf\.me"/); assert.match(cards, /bmrauf\.me/);
  assert.equal((cards.match(/credit\(c, host, '/g) ?? []).length, 4);
});
