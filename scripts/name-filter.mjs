// Screens names shown publicly. Server-only, so the list is not shipped to players and cannot be bypassed from a browser.
// To block more, add a word to the right list. It also applies to names already saved, because they are checked when shown.

// Matched anywhere in a name. Only for words that do not hide inside ordinary names.
const ANYWHERE = [
  'fuck', 'fuk', 'fck', 'fcuk', 'phuck', 'motherf', 'bitch', 'biatch', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'rapist', 'porn', 'pussy', 'asshole', 'arsehole', 'bastard', 'slut', 'wanker', 'dickhead', 'bullshit', 'blowjob', 'pedophile', 'paedo',
  // Banglish and Hindi-Urdu, as people actually type them.
  'banchod', 'bainchod', 'banchot', 'bainchot', 'behenchod', 'madarchod', 'maderchod', 'motherchod', 'bokachoda', 'bokachod', 'chudi', 'chudir', 'chudbo', 'chudte', 'chudis', 'chodon', 'choda', 'chodna', 'chodmar', 'chutiya', 'chutia', 'chutmar', 'khanki', 'khankir', 'khanky', 'magir', 'magichele', 'gandu', 'gandfat', 'haramjada', 'haramzada', 'haramjadi', 'haramzadi', 'harami', 'kuttarbaccha', 'kuttarbacha', 'shuorerbaccha', 'shuorerbacha', 'suarerbaccha', 'shuorerbaca', 'tormar', 'tormayere', 'bhosdi', 'bhenchod', 'lawra', 'lewra', 'leora', 'malaun',
  // Impersonating the game or its developer.
  'bmrauf', 'shapbhai', 'sapbhai', 'dhakained', 'snakearena'
];
// Only when the word stands alone, because each one hides inside real names: Hassan, Iqbal, Ashit, Chowdhury and so on.
const WHOLE_WORD = [
  'shit', 'shits', 'shitty', 'shithead', 'ass', 'asses', 'arse', 'dick', 'dicks', 'cock', 'cocks', 'tits', 'titty', 'boobs', 'sex', 'sexy', 'rape', 'raped', 'penis', 'vagina', 'nazi', 'hitler', 'isis', 'kkk', 'hoe', 'hoes', 'nude', 'nudes', 'xxx', 'damn', 'retard', 'retarded', 'chod', 'chodo', 'chodi', 'chud', 'chut', 'gud', 'gudh', 'gaand', 'gand', 'bal', 'baal', 'bhoda', 'voda', 'vuda', 'dhon', 'dhoon', 'magi', 'maagi', 'magy', 'shala', 'shali', 'kutta', 'kutti', 'kuttar', 'shuor', 'suar', 'randi', 'lund', 'lauda', 'loda', 'hijra', 'kamina', 'kafir', 'rajakar', 'razakar', 'besha', 'beshya',
  // Reserved, so nobody can pose as staff.
  'admin', 'administrator', 'moderator', 'developer', 'official', 'system', 'support', 'staff', 'owner'
];
const BANGLA_ANYWHERE = ['চুদ', 'চোদ', 'চুত', 'মাগি', 'মাগী', 'খানকি', 'খানকী', 'খাঙ্কি', 'বাঞ্চোত', 'বানচোত', 'হারামি', 'হারামী', 'হারামজাদ', 'শুয়োরেরবাচ্চা', 'শুওরেরবাচ্চা', 'কুত্তারবাচ্চা', 'গান্ডু', 'ভোদা', 'ভুদা', 'ধর্ষণ', 'ধর্ষক', 'বেশ্যা', 'লেওড়া', 'লেউড়া', 'মালাউন', 'কাঠমোল্লা', 'রাজাকার', 'যৌন', 'সাপভাই'];
const BANGLA_WHOLE_WORD = ['বাল', 'গুদ', 'ধোন', 'পোদ', 'পোঁদ', 'শালা', 'শালী', 'শালি', 'কুত্তা', 'কুত্তি', 'শুয়োর', 'শুওর', 'নটি', 'নটী', 'হিজড়া', 'কাফের', 'ডেভেলপার', 'এডমিন', 'অ্যাডমিন', 'মডারেটর'];
// Ordinary words that contain a blocked piece. Removed before checking.
const INNOCENT = [/scunthorpe/g, /চোদ্দ/g, /চৌদ্দ/g, /matchod/g];

// Characters from other alphabets that look like Latin letters, a common way round word lists.
const LOOKALIKE = { а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', α: 'a', β: 'b', ε: 'e', ι: 'i', κ: 'k', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', ß: 'ss' };
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l' };

// Any letter may repeat, so fuuuck and shiiit still match, but ass still needs its two s's.
const stretch = word => [...word].map(letter => `${letter}+`).join('');
const anywhere = new RegExp(ANYWHERE.map(stretch).join('|'));
const whole = new RegExp(`^(?:${WHOLE_WORD.map(stretch).join('|')})$`);
const banglaWhole = new Set(BANGLA_WHOLE_WORD);

function latinForm(text) {
  return [...text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()].map(ch => LOOKALIKE[ch] ?? LEET[ch] ?? ch).join('');
}
export function isBadName(raw) {
  if (typeof raw !== 'string') return true;
  // Invisible characters are stripped first, so they cannot split a word.
  const clean = raw.normalize('NFC').replace(/[­​-‏⁠-⁤﻿]/g, '');
  const banglaWords = clean.split(/[^ঀ-৿]+/).filter(Boolean);
  let banglaJoined = banglaWords.join('');
  for (const word of INNOCENT) banglaJoined = banglaJoined.replace(word, '');
  if (BANGLA_ANYWHERE.some(word => banglaJoined.includes(word))) return true;
  if (banglaWords.some(word => banglaWhole.has(word)) || banglaWhole.has(banglaWords.join(''))) return true;
  let latin = latinForm(clean);
  // Website addresses and phone numbers do not belong on a public board.
  if (/[a-z0-9-]\.(?:com|net|org|me|io|co|xyz|info|bd|in|ru|link|site|online|shop)\b/.test(latin) || /www/.test(latin)) return true;
  if (clean.replace(/[^\d০-৯]/g, '').length >= 7) return true;
  for (const word of INNOCENT) latin = latin.replace(word, '');
  const words = latin.split(/[^a-z]+/).filter(Boolean), joined = words.join('');
  if (anywhere.test(joined)) return true;
  if (words.some(word => whole.test(word)) || whole.test(joined)) return true;
  // Spaced-out letters, like "s h i t" inside a longer name.
  const spaced = latin.match(/(?:^|[^a-z])((?:[a-z][^a-z]+){2,}[a-z])(?=$|[^a-z])/);
  return !!spaced && (() => { const letters = spaced[1].replace(/[^a-z]/g, ''); return anywhere.test(letters) || whole.test(letters); })();
}
