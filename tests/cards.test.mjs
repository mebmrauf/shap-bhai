import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cardMood, cardCopy, grade, shareSentence, digits, duelMood, duelCopy, duelSentence, CARD_STYLES } from '../web/js/cards.js';
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
const duel = extra => ({ duel: true, winner: 0, me: 0, shared: false, opponent: 'bot', reason: 'survivor', death: 'wall', matchOver: false, wins: [2, 1], ...extra });
test('1 vs 1 cards follow who won and how', () => {
  assert.equal(duelMood(duel({})), 'winWall');
  assert.equal(duelMood(duel({ death: 'self' })), 'winSelf');
  assert.equal(duelMood(duel({ death: 'opponent' })), 'winHit');
  assert.equal(duelMood(duel({ winner: 1, death: 'wall' })), 'loseWall');
  assert.equal(duelMood(duel({ winner: 0, me: 1, death: 'self' })), 'loseSelf');
  assert.equal(duelMood(duel({ reason: 'time', death: null })), 'winTime');
  assert.equal(duelMood(duel({ winner: 1, reason: 'time', death: null })), 'loseTime');
  assert.equal(duelMood(duel({ matchOver: true })), 'matchWon');
  assert.equal(duelMood(duel({ winner: 1, matchOver: true })), 'matchLost');
  assert.equal(duelMood(duel({ winner: null, reason: 'double-crash', death: 'head-on' })), 'headOn');
  assert.equal(duelMood(duel({ winner: null, reason: 'time', death: null })), 'tie');
  assert.equal(duelMood(duel({ shared: true, winner: 1 })), 'p1');
});
test('every 1 vs 1 design has complete text for every outcome, in both languages', () => {
  const runs = [duel({}), duel({ death: 'self' }), duel({ winner: 1 }), duel({ winner: 1, matchOver: true, wins: [1, 3] }), duel({ matchOver: true, wins: [3, 0] }), duel({ winner: null, death: 'head-on', wins: [0, 0] }), duel({ winner: null, reason: 'time', death: null }), duel({ shared: true, opponent: 'local' }), duel({ opponent: 'online', winner: 1 })];
  for (const style of CARD_STYLES) for (const run of runs) for (const lang of ['bn', 'en']) {
    for (const text of texts(duelCopy(style, run, lang))) { assert.ok(text.length > 0); assert.equal(/undefined|NaN|\[object/.test(text), false, text); }
    assert.equal(/undefined|NaN/.test(duelSentence(run, lang)), false);
  }
});
test('the score is told from the sharer\'s side, and the loser gets the joke', () => {
  assert.equal(duelSentence(duel({}), 'en'), 'I beat the computer, 2–1. Can you?');
  assert.equal(duelSentence(duel({ winner: 1, wins: [1, 2], opponent: 'online' }), 'en'), 'My friend beat me, 1–2. Avenge me?');
  assert.match(duelSentence(duel({ winner: 1, wins: [1, 2] }), 'bn'), /কম্পিউটারের কাছে হারলাম.*১–২/);
  const loser = duelCopy('marksheet', duel({ winner: 1, wins: [0, 1] }), 'en');
  assert.equal(loser.stamp, 'LOSER'); assert.equal(Object.fromEntries(loser.rows)['Excuses after losing'], 'A+'); assert.equal(Object.fromEntries(loser.rows)['Recognising walls'], 'F');
  assert.equal(duelCopy('wanted', duel({}), 'bn').score, '২–১');
});
test('on a shared keyboard the card names the player, not "you"', () => {
  assert.equal(duelSentence(duel({ shared: true, opponent: 'local', winner: 1, wins: [1, 2] }), 'en'), 'Player 2 leads 2–1. Your turn next!');
});
