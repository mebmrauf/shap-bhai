import test from 'node:test';
import assert from 'node:assert/strict';
import { isBadName } from '../scripts/name-filter.mjs';
import { Leaderboard } from '../scripts/leaderboard.mjs';
const blocked = list => { for (const name of list) assert.equal(isBadName(name), true, `should block: ${name}`); };
const allowed = list => { for (const name of list) assert.equal(isBadName(name), false, `should allow: ${name}`); };
test('plain profanity is blocked in English, Banglish and Bangla', () => blocked([
  'fuck', 'FUCK YOU', 'Shit', 'big shit', 'bitch boy', 'asshole', 'ass', 'dick', 'madarchod', 'banchod', 'bokachoda', 'khanki', 'magi', 'haramjada', 'kuttar baccha', 'gandu', 'chudi',
  'চোদা', 'বোকাচোদা', 'মাগি', 'খানকি', 'হারামি', 'হারামজাদা', 'কুত্তার বাচ্চা', 'শুয়োরের বাচ্চা', 'গান্ডু', 'বাল', 'শালা'
]));
test('common tricks do not get round it', () => blocked([
  'fuuuuck', 'f u c k', 'f.u.c.k', 'f_u_c_k', 'f-u-c-k', 'fu ck', 'sh1t', 'sh!t', '$hit', 'shiiiit', 'b1tch', 'b!tch', 'a$$', '@ss', 'a.s.s', 'd1ck', 'mad4rch0d', 'ch0da', 'kh4nki',
  'fսck'.replace('ս', 'u'), 'fuсk' /* Cyrillic с */, 'аss' /* Cyrillic а */, 'f​uck' /* invisible character */, 'ｆｕｃｋ' /* full width */, 'fúck', 'মা গি', 'খা ন কি', 'চো‌দা', 'my f u c k name'
]));
test('real Bangladeshi and other names are not caught by accident', () => allowed([
  'রাফি', 'মিতু', 'Rafi', 'Mitu', 'Hassan', 'Hasan', 'Assad', 'Asad', 'Iqbal', 'Babul', 'Ashit', 'Shitol', 'Chowdhury', 'Chodhury', 'Sadia', 'Basit', 'Fakir', 'Fahim', 'Mahbub', 'Dickson', 'Essex', 'Sussex', 'Scunthorpe', 'Cassandra', 'Class Topper', 'Bass Player', 'Peacock', 'Hancock', 'Shalini', 'Salim', 'Salma', 'Sultana', 'Magistrate', 'Magic Snake', 'Randy', 'Modhu', 'Dev', 'Mod', 'Sali', 'Sala', 'Noti', 'Rand', 'Devjani', 'Devi', 'Noor', 'Golam', 'Gulshan', 'Shahin', 'Bala', 'Kuddus',
  'আকাশ', 'বালক', 'বালিকা', 'শালবন', 'চোদ্দ শিকল', 'চৌধুরী', 'হাসান', 'ইকবাল', 'রাজা', 'ধনু', 'নটরডেম'
]));
test('nobody can pose as staff or the developer', () => blocked(['admin', 'ADMIN', 'Moderator', 'Developer', 'bmrauf', 'bm rauf', 'bmrauf.me', 'Dhaka in 3D', 'Shap Bhai', 'shapbhai', 'সাপ ভাই', 'Official', 'এডমিন', 'ডেভেলপার']));
test('links and phone numbers stay off the board', () => blocked(['www.spam', 'buy.com', 'spam.net', 'visit.bd', '01712345678', '০১৭১২৩৪৫৬৭৮', '017 1234 5678']));
test('short numbers in a name are fine', () => allowed(['Rafi 99', 'Player 7', 'Team 2024']));
function fakePool(rows = []) { return { writes: 0, async query(text) { if (text.includes('INSERT')) this.writes++; return { rows: text.includes('SELECT') ? rows : [] }; } }; }
const TOKEN = 'a'.repeat(32);
test('a bad name or crew is refused before anything is saved', async () => {
  const pool = fakePool(), board = new Leaderboard(pool);
  await assert.rejects(board.saveProfile({ token: TOKEN, name: 'sh1t head' }), /not allowed/);
  await assert.rejects(board.saveProfile({ token: TOKEN, name: 'মাগি' }), /not allowed/);
  await assert.rejects(board.saveProfile({ token: TOKEN, name: 'Rafi', crew: 'FUCK-U' }), /crew code is not allowed/);
  assert.equal(pool.writes, 0);
  assert.equal((await board.saveProfile({ token: TOKEN, name: 'Hassan', crew: 'DU-CSE' })).name, 'Hassan');
  assert.equal(pool.writes, 1);
});
test('a bad name saved earlier is hidden when the board is shown', async () => {
  const board = new Leaderboard(fakePool([{ name: 'fuck off', district: 'Dhaka', score: 9 }, { name: 'Rafi', district: '', score: 3 }]));
  assert.deepEqual((await board.top()).rows.map(row => row.name), ['Player', 'Rafi']);
});
test('a ghost link never spreads a bad name', async () => {
  const board = new Leaderboard(fakePool([{ name: 'bitch', record: {} }]));
  assert.equal((await board.ghost('AAAAAAAAAAA')).name, 'তোমার বন্ধু');
});
