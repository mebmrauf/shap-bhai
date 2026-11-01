// Share cards: four joke designs, in the player's language. All text is chosen by pure functions so it can be tested.
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const digits = (n, lang) => lang === 'bn' ? String(n).replace(/\d/g, d => BN_DIGITS[d]) : String(n);
export const CARD_STYLES = Object.freeze(['newspaper', 'wanted', 'marksheet', 'rickshaw']);
const FOOD = { dhaka: ['ফুচকা', 'fuchka'], rooftop: ['রসগোল্লা', 'roshogolla'], coxs: ['ইলিশ', 'ilish'], sundarbans: ['ঝালমুড়ি', 'jhalmuri'] };
const HEADLINES = {
  best: ['নতুন রেকর্ড! পাড়ায় মিষ্টি বিতরণ', 'New record! Free sweets for the whole para'],
  zero: ['একটাও না খেয়ে সাপের বিদায়, মা চিন্তিত', 'Snake leaves hungry. Mother worried.'],
  wall: ['দেয়ালে সাপের ধাক্কা, দেয়াল অক্ষত', 'Snake hits wall. Wall is fine.'],
  self: ['নিজের লেজ খেয়ে সাপ হাসপাতালে', 'Snake eats own tail, demands refund'],
  traffic: ['বাসের সাথে ধাক্কা, বাস থামেনি', 'Snake hits bus. Bus did not stop.'],
  full: ['পুরা মাঠ দখল! সিটি কর্পোরেশন হতবাক', 'Snake occupies entire board. City Corporation stunned.']
};
const CRIMES = {
  best: ['হাই স্কোর চুরি', 'Stealing the high score'], zero: ['খাবার নষ্ট করা', 'Wasting perfectly good food'],
  wall: ['সরকারি দেয়ালে হামলা', 'Attacking a public wall'], self: ['নিজের লেজ চুরি করে খাওয়া', 'Stealing and eating its own tail'],
  traffic: ['লোকাল বাসের রাস্তা আটকানো', 'Blocking a local bus'], full: ['অবৈধভাবে পুরা মাঠ দখল', 'Illegal occupation of the entire board']
};
const ACTIONS = {
  best: ['রেকর্ড ভাঙলো', 'broke the record'], zero: ['কিছুই খেতে পারলো না', 'managed to eat nothing'],
  wall: ['দেয়ালে ধাক্কা খাইলো', 'hit a wall'], self: ['নিজের লেজ কামড়াইলো', 'bit its own tail'],
  traffic: ['বাসের সাথে ধাক্কা খাইলো', 'crashed into a bus'], full: ['পুরা মাঠ দখল করলো', 'took over the whole board']
};
const pick = (table, lang) => table[lang === 'bn' ? 0 : 1];
// What the run was about. A new record outranks how it ended; a full board outranks everything.
export function cardMood({ reason, score = 0, newBest = false }) {
  if (reason === 'board-full' || reason === 'limit') return 'full';
  if (newBest && score > 0) return 'best';
  if (score === 0) return 'zero';
  return { wall: 'wall', self: 'self', traffic: 'traffic' }[reason] ?? 'wall';
}
export function grade(score) {
  if (score >= 40) return { gpa: '5.00', letter: 'A+', pass: true };
  if (score >= 25) return { gpa: '4.00', letter: 'A', pass: true };
  if (score >= 12) return { gpa: '3.00', letter: 'B', pass: true };
  if (score >= 5) return { gpa: '2.00', letter: 'C', pass: true };
  return { gpa: '0.00', letter: 'F', pass: false };
}
export function shareSentence({ apples = 0, theme = 'dhaka', mood, lang = 'bn' }) {
  const food = FOOD[theme] ?? FOOD.dhaka;
  return lang === 'bn'
    ? `আমার সাপ ${digits(apples, lang)}টা ${food[0]} খেয়ে ${ACTIONS[mood][0]}। তুমি পারবা?`
    : `My snake ate ${apples} ${food[1]} and ${ACTIONS[mood][1]}. Can you beat it?`;
}
export function cardCopy(style, { score = 0, apples = 0, theme = 'dhaka', mood = 'wall', lang = 'bn' }) {
  const bn = lang === 'bn', n = value => digits(value, lang), foodName = pick(FOOD[theme] ?? FOOD.dhaka, lang), sentence = shareSentence({ apples, theme, mood, lang });
  if (style === 'newspaper') return {
    masthead: bn ? 'দৈনিক সাপের খবর' : 'THE DAILY SNAKE', strap: bn ? 'দাম: একটা ফুচকা' : 'Price: one fuchka',
    headline: pick(HEADLINES[mood], lang), reporter: bn ? 'নিজস্ব প্রতিবেদক, ঢাকা' : 'Our reporter, Dhaka', story: sentence,
    scoreLabel: bn ? 'স্কোর' : 'SCORE', score: n(score),
    ticker: bn ? 'আবহাওয়া: যেকোনো সময় লোডশেডিং। জ্যাম: সবখানে।' : 'Weather: load shedding any minute. Traffic: everywhere.'
  };
  if (style === 'wanted') return {
    title: bn ? 'ওয়ান্টেড!' : 'WANTED', crimeLabel: bn ? 'অপরাধ' : 'CRIME', crime: pick(CRIMES[mood], lang),
    evidence: bn ? `প্রমাণ: ${n(apples)}টা ${foodName} গায়েব` : `Evidence: ${apples} ${foodName} missing`,
    warning: bn ? 'দেখলে খাবার দিবেন না!' : 'Do not feed this snake!', reward: bn ? 'পুরস্কার: এক কাপ চা' : 'Reward: one cup of tea', score: n(score), scoreLabel: bn ? 'স্কোর' : 'SCORE'
  };
  if (style === 'marksheet') {
    const result = grade(score), mark = (fail, good) => fail ? 'F' : good;
    return {
      board: bn ? 'সাপ শিক্ষা বোর্ড, ঢাকা' : 'DHAKA BOARD OF SNAKE EDUCATION', title: bn ? 'একাডেমিক ট্রান্সক্রিপ্ট' : 'ACADEMIC TRANSCRIPT',
      rows: [
        [bn ? `${foodName} খাওয়া` : `Eating ${foodName}`, result.letter],
        [bn ? 'দেয়াল চেনা' : 'Recognising walls', mark(mood === 'wall' || mood === 'zero', 'A')],
        [bn ? 'লেজ সামলানো' : 'Tail management', mark(mood === 'self', 'A')],
        [bn ? 'বাস এড়ানো' : 'Avoiding buses', mark(mood === 'traffic', 'B')],
        [bn ? 'আম্মুকে ফাঁকি দেওয়া' : 'Hiding from Mom', 'A+']
      ],
      gpaLabel: 'GPA', gpa: n(result.gpa), scoreLabel: bn ? 'মোট স্কোর' : 'TOTAL SCORE', score: n(score), stamp: result.pass ? (bn ? 'পাস!' : 'PASSED') : (bn ? 'ফেল!' : 'FAILED'), pass: result.pass,
      note: result.pass ? (bn ? 'মন্তব্য: আম্মুকে দেখানো যাবে।' : 'Remark: safe to show Mom.') : (bn ? 'মন্তব্য: আম্মুকে দেখাইও না।' : 'Remark: do not show Mom.')
    };
  }
  return { title: bn ? 'ঢাকার রাস্তায় সাপ' : 'SNAKE ON DHAKA ROAD', story: sentence, score: n(score), scoreLabel: bn ? 'স্কোর' : 'SCORE', plate: bn ? 'ঢাকা মেট্রো-সাপ ১১-২২২২' : 'DHAKA METRO-SNAKE 11-2222' };
}

const FONT = 'Bangla, "Segoe UI", system-ui, sans-serif';
function wrap(c, text, maxWidth) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) {
    const attempt = line ? `${line} ${word}` : word;
    if (c.measureText(attempt).width > maxWidth && line) { lines.push(line); line = word; } else line = attempt;
  }
  return [...lines, line];
}
function write(c, text, x, y, size, maxWidth, { weight = 800, color = '#fff', gap = 1.3, align = 'center' } = {}) {
  c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
  const rows = wrap(c, text, maxWidth);
  rows.forEach((row, i) => c.fillText(row, x, y + i * size * gap));
  return y + rows.length * size * gap;
}
// The biggest size at which the text still fits the given number of lines.
function fitSize(c, text, start, maxWidth, maxLines, weight = 900) {
  for (let size = start; size > 30; size -= 4) { c.font = `${weight} ${size}px ${FONT}`; if (wrap(c, text, maxWidth).length <= maxLines) return size; }
  return 30;
}
function photo(c, shot, x, y, w, h, { radius = 0, filter = 'none' } = {}) {
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, radius); c.clip();
  if (shot) {
    const scale = Math.max(w / shot.width, h / shot.height), dw = shot.width * scale, dh = shot.height * scale;
    c.filter = filter; c.drawImage(shot, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); c.filter = 'none';
  } else { c.fillStyle = '#34295a'; c.fillRect(x, y, w, h); }
  c.restore();
}
function speckle(c, w, h, color, count) { c.fillStyle = color; for (let i = 0; i < count; i++) c.fillRect((i * 7919) % w, (i * 6271) % h, 2 + i % 3, 2 + (i * 3) % 3); }
function flower(c, x, y, r, petal = '#fff', middle = '#ffd23f') {
  c.fillStyle = petal; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .72, r * .42, a, 0, 7); c.fill(); }
  c.fillStyle = middle; c.beginPath(); c.arc(x, y, r * .62, 0, 7); c.fill();
}
function floralBand(c, y, h, w = 1080, back = '#0b6e6e') {
  c.fillStyle = '#ffd23f'; c.fillRect(0, y, w, h); c.fillStyle = back; c.fillRect(0, y + 7, w, h - 14);
  for (let x = h / 2; x < w; x += h) flower(c, x, y + h / 2, h * .16);
}
function credit(c, host, color, y = 1880) {
  c.font = `600 30px ${FONT}`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(`${host}  ·  dev: bmrauf.me`, 540, y);
}
function drawNewspaper(c, t, shot, host) {
  c.fillStyle = '#efe6cf'; c.fillRect(0, 0, 1080, 1920); speckle(c, 1080, 1920, '#00000012', 1400);
  c.fillStyle = '#161210'; c.fillRect(60, 60, 960, 8);
  write(c, t.masthead, 540, 190, fitSize(c, t.masthead, 112, 940, 1), 960, { weight: 900, color: '#161210' });
  c.fillRect(60, 225, 960, 4); c.fillRect(60, 280, 960, 8);
  write(c, t.strap, 80, 268, 32, 500, { weight: 700, color: '#161210', align: 'left' });
  c.font = `700 32px ${FONT}`; c.textAlign = 'right'; c.fillStyle = '#b3123e'; c.fillText(t.scoreLabel + ': ' + t.score, 1000, 268);
  const size = fitSize(c, t.headline, 120, 950, 3);
  const bottom = write(c, t.headline, 540, 300 + size, size, 950, { weight: 900, color: '#161210', gap: 1.18 });
  const top = bottom - size * .4 + 10, photoHeight = 1440 - top;
  photo(c, shot, 60, top, 960, photoHeight, { filter: 'grayscale(1) contrast(1.25) sepia(.25)' });
  c.lineWidth = 6; c.strokeStyle = '#161210'; c.strokeRect(60, top, 960, photoHeight);
  // The score as a red rubber stamp, the one loud thing on the page.
  c.save(); c.translate(860, top + 120); c.rotate(-.16); c.lineWidth = 9; c.strokeStyle = '#d7263d'; c.fillStyle = '#efe6cfe8'; c.beginPath(); c.roundRect(-150, -90, 300, 180, 18); c.fill(); c.stroke();
  write(c, t.scoreLabel, 0, -28, 38, 280, { weight: 900, color: '#d7263d' }); write(c, t.score, 0, 66, 96, 280, { weight: 900, color: '#d7263d' }); c.restore();
  const under = top + photoHeight + 56;
  write(c, t.reporter, 70, under, 32, 900, { weight: 700, color: '#6b5f4a', align: 'left' });
  write(c, t.story, 70, under + 66, fitSize(c, t.story, 50, 940, 2, 700), 940, { weight: 700, color: '#161210', align: 'left', gap: 1.34 });
  c.fillStyle = '#161210'; c.fillRect(0, 1710, 1080, 110);
  write(c, t.ticker, 540, 1775, fitSize(c, t.ticker, 38, 1020, 1, 700), 1040, { weight: 700, color: '#ffd23f' });
  credit(c, host, '#3b3226');
}
function drawWanted(c, t, shot, host) {
  const g = c.createRadialGradient(540, 800, 200, 540, 960, 1200); g.addColorStop(0, '#e9cf97'); g.addColorStop(1, '#a9793f'); c.fillStyle = g; c.fillRect(0, 0, 1080, 1920); speckle(c, 1080, 1920, '#4a2c1218', 1800);
  c.lineWidth = 12; c.strokeStyle = '#3a2210'; c.strokeRect(36, 36, 1008, 1848); c.lineWidth = 3; c.strokeRect(58, 58, 964, 1804);
  for (const [x, y] of [[36, 36], [1044, 36], [36, 1884], [1044, 1884]]) { c.fillStyle = '#5b5148'; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); }
  write(c, t.title, 540, 240, fitSize(c, t.title, 200, 900, 1), 940, { weight: 900, color: '#3a2210' });
  photo(c, shot, 110, 290, 860, 800, { filter: 'sepia(.85) contrast(1.15) brightness(.98)' });
  c.lineWidth = 10; c.strokeStyle = '#3a2210'; c.strokeRect(110, 290, 860, 800);
  c.save(); c.translate(820, 1020); c.rotate(-.14); c.fillStyle = '#d7263d'; c.beginPath(); c.roundRect(-150, -66, 300, 132, 14); c.fill();
  write(c, t.scoreLabel + ' ' + t.score, 0, 18, 52, 280, { weight: 900, color: '#fff' }); c.restore();
  write(c, t.crimeLabel, 540, 1170, 44, 900, { weight: 800, color: '#7a2a12' });
  const size = fitSize(c, t.crime, 92, 900, 2);
  const after = write(c, t.crime, 540, 1170 + size + 8, size, 900, { weight: 900, color: '#2a1608', gap: 1.2 });
  const line = after + 10; c.fillStyle = '#3a2210'; c.fillRect(190, line - 40, 700, 5);
  write(c, t.evidence, 540, line + 34, 48, 900, { weight: 700, color: '#2a1608' });
  write(c, t.warning, 540, line + 118, 62, 920, { weight: 900, color: '#a3122f' });
  c.fillStyle = '#3a2210'; c.beginPath(); c.roundRect(150, 1668, 780, 110, 16); c.fill();
  write(c, t.reward, 540, 1742, 56, 740, { weight: 900, color: '#ffd23f' });
  credit(c, host, '#3a2210', 1845);
}
function drawMarksheet(c, t, shot, host) {
  c.fillStyle = '#fbfaf2'; c.fillRect(0, 0, 1080, 1920);
  c.strokeStyle = '#0b6e4f'; c.lineWidth = 14; c.strokeRect(34, 34, 1012, 1852); c.lineWidth = 3; c.strokeRect(56, 56, 968, 1808);
  // A faint board seal behind the table, like the real thing.
  c.globalAlpha = .06; flower(c, 540, 1040, 230, '#0b6e4f', '#0b6e4f'); c.globalAlpha = 1;
  flower(c, 540, 130, 34, '#0b6e4f', '#d7263d');
  write(c, t.board, 540, 235, fitSize(c, t.board, 66, 930, 1), 940, { weight: 900, color: '#0b4f39' });
  write(c, t.title, 540, 295, 38, 900, { weight: 700, color: '#555' });
  photo(c, shot, 270, 330, 540, 400, { radius: 8 }); c.lineWidth = 4; c.strokeStyle = '#333'; c.strokeRect(270, 330, 540, 400);
  let y = 780; c.fillStyle = '#0b6e4f'; c.fillRect(90, y, 900, 8); y += 8;
  t.rows.forEach(([subject, mark], i) => {
    if (i % 2) { c.fillStyle = '#0b6e4f12'; c.fillRect(90, y, 900, 116); }
    write(c, subject, 120, y + 74, fitSize(c, subject, 50, 680, 1, 700), 700, { weight: 700, color: '#222', align: 'left' });
    write(c, mark, 950, y + 78, 66, 200, { weight: 900, color: mark === 'F' ? '#d7263d' : '#0b6e4f', align: 'right' });
    y += 116; c.fillStyle = '#0b6e4f55'; c.fillRect(90, y - 2, 900, 2);
  });
  y += 104;
  write(c, `${t.gpaLabel}: ${t.gpa}`, 120, y, 88, 560, { weight: 900, color: '#111', align: 'left' });
  write(c, `${t.scoreLabel}: ${t.score}`, 120, y + 66, 44, 560, { weight: 700, color: '#444', align: 'left' });
  write(c, t.note, 540, y + 200, fitSize(c, t.note, 58, 900, 1), 920, { weight: 900, color: '#0b4f39' });
  c.save(); c.translate(790, y + 26); c.rotate(-.16); c.globalAlpha = .9; c.lineWidth = 12; const stampColor = t.pass ? '#0b8a57' : '#d7263d'; c.strokeStyle = stampColor; c.beginPath(); c.roundRect(-185, -82, 370, 164, 22); c.stroke();
  write(c, t.stamp, 0, 34, fitSize(c, t.stamp, 96, 330, 1), 340, { weight: 900, color: stampColor }); c.restore();
  credit(c, host, '#555', 1835);
}
function drawRickshaw(c, t, line, shot, host) {
  c.fillStyle = '#d7263d'; c.fillRect(0, 0, 1080, 1920);
  // Painted sun rays, straight off the back of a rickshaw.
  c.save(); c.translate(540, 1010); for (let i = 0; i < 28; i++) { c.fillStyle = i % 2 ? '#ffd23f' : '#ff7a1a'; c.beginPath(); c.moveTo(0, 0); const a = i / 28 * Math.PI * 2, b = (i + 1) / 28 * Math.PI * 2; c.lineTo(Math.cos(a) * 1400, Math.sin(a) * 1400); c.lineTo(Math.cos(b) * 1400, Math.sin(b) * 1400); c.fill(); } c.restore();
  floralBand(c, 0, 110); floralBand(c, 1810, 110);
  c.fillStyle = '#0b6e6e'; c.beginPath(); c.roundRect(70, 140, 940, 110, 24); c.fill(); c.lineWidth = 7; c.strokeStyle = '#ffd23f'; c.stroke();
  write(c, t.title, 540, 216, fitSize(c, t.title, 66, 880, 1), 900, { weight: 900, color: '#fff' });
  const size = fitSize(c, line, 88, 950, 3);
  c.font = `900 ${size}px ${FONT}`; c.textAlign = 'center';
  const rows = wrap(c, line, 950); let y = 275 + size;
  for (const row of rows) { c.lineJoin = 'round'; c.lineWidth = size * .2; c.strokeStyle = '#140f22'; c.strokeText(row, 540, y); c.fillStyle = '#fff'; c.fillText(row, 540, y); y += size * 1.22; }
  const top = y - size * .6;
  // Oval frame, the way rickshaw painters frame a scene.
  c.save(); c.beginPath(); c.ellipse(540, top + 330, 470, 320, 0, 0, 7); c.clip(); photo(c, shot, 60, top, 960, 660); c.restore();
  c.lineWidth = 22; c.strokeStyle = '#140f22'; c.beginPath(); c.ellipse(540, top + 330, 470, 320, 0, 0, 7); c.stroke(); c.lineWidth = 10; c.strokeStyle = '#17d3bb'; c.stroke();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; flower(c, 540 + Math.cos(a) * 470, top + 330 + Math.sin(a) * 320, 16, '#fff', '#ff2e63'); }
  const scoreY = top + 680 + 200;
  c.save(); c.translate(540, scoreY - 60); c.rotate(-.04); c.fillStyle = '#140f22'; c.beginPath(); c.roundRect(-290, -140, 580, 250, 30); c.fill();
  c.font = `900 170px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#ffd23f'; c.fillText(t.score, 0, 60); c.font = `800 36px ${FONT}`; c.fillStyle = '#fff'; c.fillText(t.scoreLabel, 0, -92); c.restore();
  const textY = write(c, t.story, 540, scoreY + 100, fitSize(c, t.story, 48, 960, 2, 800), 960, { weight: 800, color: '#140f22', gap: 1.3 });
  c.fillStyle = '#fff'; c.beginPath(); c.roundRect(200, Math.min(textY + 6, 1670), 680, 68, 10); c.fill(); c.lineWidth = 5; c.strokeStyle = '#140f22'; c.stroke();
  write(c, t.plate, 540, Math.min(textY + 6, 1670) + 48, fitSize(c, t.plate, 36, 640, 1, 800), 660, { weight: 800, color: '#140f22' });
  c.fillStyle = '#140f22'; c.beginPath(); c.roundRect(170, 1750, 740, 54, 27); c.fill(); credit(c, host, '#fff', 1788);
}
// Paints onto the canvas it is given, so the preview and the shared file are the same picture.
export async function paintCard(canvas, style, run, { lang, shot, host }) {
  await Promise.all([document.fonts.load(`900 60px Bangla`, 'বাংলা'), document.fonts.load(`700 40px Bangla`, 'বাংলা')]).catch(() => {});
  canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext('2d'), mood = cardMood(run), copy = cardCopy(style, { ...run, mood, lang });
  c.clearRect(0, 0, 1080, 1920);
  if (style === 'newspaper') drawNewspaper(c, copy, shot, host);
  else if (style === 'wanted') drawWanted(c, copy, shot, host);
  else if (style === 'marksheet') drawMarksheet(c, copy, shot, host);
  else drawRickshaw(c, copy, lang === 'bn' ? run.line : pick(HEADLINES[mood], lang), shot, host);
  return shareSentence({ ...run, mood, lang });
}
