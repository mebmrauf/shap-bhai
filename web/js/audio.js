import { adventureVoices } from './adventures.js';
import { SIZE } from './engine.js';

// Scenario variants of Chaos lines. Dhaka keeps the base line; a missing variant falls back to it.
const SCENE = {
  startChaos_rooftop: ['পুরান ঢাকার ছাদে স্বাগতম! এখানে রিকশাও ছাদে ওঠে।', 'Welcome to the Old Dhaka rooftop! Up here, even rickshaws take the stairs.'],
  startChaos_coxs: ['কক্সবাজারে স্বাগতম! সাগর, বোট আর কাঁকড়া, সবাই তোমার পিছে!', "Welcome to Cox's Bazar! The sea, the boats and the crabs are all after you!"],
  startChaos_sundarbans: ['সুন্দরবনে স্বাগতম! নেটওয়ার্ক নাই, বাঘ আছে।', 'Welcome to the Sundarbans! No phone signal, plenty of tigers.'],
  chaosPower_rooftop: ['লোডশেডিং! ছাদে এখন শুধু চাঁদ আর মশা।', 'Load-shedding! Just the moon and the mosquitoes on the roof now.'],
  chaosPower_coxs: ['সৈকতের বাতি নিভে গেছে! সাগর বলল, আমার কারেন্ট লাগে না।', "Beach lights out! The sea says it never needed electricity anyway."],
  chaosPower_sundarbans: ['জঙ্গলে ঘুটঘুটে অন্ধকার! কারেন্ট তো এখানে আগেও ছিল না।', 'Pitch dark jungle! To be fair, there was never power here.'],
  chaosPowerBack_rooftop: ['কারেন্ট আসছে! পুরা মহল্লা একসাথে চিৎকার দিলো!', "Power's back! The whole mohalla cheered at once!"],
  chaosPowerBack_coxs: ['বাতি জ্বলছে! কাঁকড়ারা আবার সেলফি তুলছে।', 'Lights back on! The crabs are taking selfies again.'],
  chaosPowerBack_sundarbans: ['চাঁদ উঠছে! বাঘ মামা আবার তোমাকে দেখতে পাচ্ছে।', 'The moon is out! Tiger uncle can see you again.'],
  chaosTraffic_rooftop: ['ছাদে রিকশা উঠলো কেমনে?! লাল ঘর ছাড়ো!', 'How did rickshaws get on the roof?! Off the red tiles!'],
  chaosTraffic_coxs: ['বিচ বাইক আর স্পিডবোট আসছে! লাল বালি ছাড়ো, এটা ফটোশুট না!', 'Beach buggies and speedboats incoming! Off the red sand, this is not a photo shoot!'],
  chaosTraffic_sundarbans: ['বন্যপ্রাণী পার হচ্ছে! হাতি সাইড দেয় না, ভাই!', "Wildlife crossing! Elephants don't give way, bro!"],
  chaosTrafficEnd_rooftop: ['রিকশা নেমে গেছে! নানু বলল, এটা ছাদ, গ্যারেজ না।', 'Rickshaws gone! Nanu says this is a roof, not a garage.'],
  chaosTrafficEnd_coxs: ['বোট চলে গেছে! সৈকত আবার তোমার।', 'Boats are gone! The beach is all yours again.'],
  chaosTrafficEnd_sundarbans: ['রাস্তা ফাঁকা! কুমির বলল, আবার দেখা হবে।', 'Path is clear! The crocodile says see you later.'],
  chaosFlood_rooftop: ['ছাদে পানি জমছে! নানুর টব এখন নৌকা।', "Water pooling on the roof! Nanu's flowerpots are boats now."],
  chaosFlood_coxs: ['জোয়ার আসছে! পানিতে মোড় ঘোরানো নিষেধ, সাগরের নিয়ম!', "High tide! No turning in the water. Sea rules, not yours!"],
  chaosFlood_sundarbans: ['নদীতে জোয়ার! কুমির ভাই সাঁতারের ক্লাস খুলেছে।', 'River tide rising! Crocodile bro is offering swimming lessons.'],
  chaosFloodEnd_rooftop: ['পানি নামছে! টবগুলো আবার টব হয়ে গেছে।', "Water's draining! The flowerpots are just pots again."],
  chaosFloodEnd_coxs: ['ভাটা শুরু! ঢেউ বলল, আবার আসবো।', "Low tide! The waves promise they'll be back."],
  chaosFloodEnd_sundarbans: ['ভাটা! কুমির ভাইয়ের ক্লাস ছুটি।', "Low tide! Crocodile bro's class is dismissed."],
  chaosWedding_rooftop: ['ছাদে বিয়ের প্যান্ডেল! দাওয়াত ছাড়াই বিরিয়ানি খাও!', 'Wedding on the rooftop! Grab the biryani, no invite needed!'],
  chaosWedding_coxs: ['সৈকতে বিয়ে! বালি ছাড়া বিরিয়ানি পেলে ভাগ্য ভালো।', 'Beach wedding! Lucky if the biryani comes without sand.'],
  chaosWedding_sundarbans: ['বনে বিয়ে! বাঘ মামার দাওয়াত, খেয়াল রেখো তুমি যেন মেনুতে না থাকো!', "Jungle wedding! Tiger uncle's invite. Just make sure you're not on the menu!"],
  roastTraffic1_coxs: ['স্পিডবোটের সাথে রেস? সাপের তো ইঞ্জিনই নাই!', "Racing a speedboat? Snakes don't even have engines!"],
  roastTraffic2_coxs: ['বিচ বাইক থামবে ভাবছিলা? এটা কক্সবাজার, ভাই।', "Thought the beach buggy would stop? This is Cox's Bazar, bro."],
  roastTraffic1_sundarbans: ['হাতির সাথে ধাক্কা? হাতি টেরও পায় নাই!', "Bumped into an elephant? It didn't even notice!"],
  combo_dhaka: ['টানা ফুচকা! মামা হাত চালায়ে কূল পাইতেছে না!', "Fuchka streak! Uncle can't fill them fast enough!"],
  combo_rooftop: ['টানা রসগোল্লা! কবুতর হা কইরা তাকায় আছে।', 'Rosogolla streak! The pigeon is staring with its beak open.'],
  combo_coxs: ['টানা ইলিশ! জেলেরা জাল ফালায়ে তোমার পিছে দৌড়াইতেছে।', 'Ilish streak! The fishers dropped their nets to follow you.'],
  combo_sundarbans: ['টানা ঝালমুড়ি! বাঘ মামাও এত জোরে খায় না।', "Jhalmuri streak! Even tiger uncle doesn't eat this fast."],
  roastTraffic2_sundarbans: ['কুমিরকে গাছের গুঁড়ি ভাবছিলা? ভুল গুঁড়ি।', 'Thought the crocodile was a log? Wrong log.'],
};
const sceneBank = (base, theme) => Object.keys(SCENE).filter(k => k.endsWith(`_${theme}`) && k.replace(/\d?_[a-z]+$/, '') === base);
const SCENE_BANKS = { startChaos: 'startChaos', loadshedding: 'chaosPower', loadsheddingEnd: 'chaosPowerBack', traffic: 'chaosTraffic', trafficEnd: 'chaosTrafficEnd', flood: 'chaosFlood', floodEnd: 'chaosFloodEnd', wedding: 'chaosWedding', roastTraffic: 'roastTraffic', combo: 'combo' };
const sceneReactions = Object.fromEntries(['dhaka', 'rooftop', 'coxs', 'sundarbans'].flatMap(theme => Object.entries(SCENE_BANKS)
  .map(([bank, base]) => [`${bank}_${theme}`, [...sceneBank(base, theme), ...(bank === 'traffic' ? ['help'] : [])]])
  .filter(([, lines]) => lines.length && lines[0] !== 'help')));

export const phrases = Object.freeze({
  ...Object.fromEntries(Object.entries(SCENE).map(([key, pair]) => [key, pair[0]])),
  ...Object.fromEntries(Object.entries(adventureVoices).map(([key, pair]) => [key, pair[0]])),
  start: 'চলো ভাই, খেলা শুরু!', eat: 'উউহু!', combo: 'টানা খাইতেছো! থামাথামি নাই!',
  help: 'ও বাবা গো! কেউ বাঁচাও আমাকে!', run: 'পালাওওওও!',
  roastWall1: 'দেয়াল তো নড়ে নাই, ভাই।', roastWall2: 'শুরু হইতেই শেষ! এইটা কি ট্রেলার ছিল?',
  roastWall3: 'চোখ কই থাকে তোমার? ফোনে?', roastWall4: 'ভালোই তো চলতেছিল, দেয়াল দেইখা প্রেমে পড়ে গেলা?',
  roastWall5: 'ব্রেক কই ভাই? লোকাল বাসও এর চেয়ে ভালো চালায়।', roastWall6: 'এত কষ্টের সাপ, এক ধাক্কায় শেষ!',
  roastWall7: 'সবাই দেখছে, সাপ সোজা দেয়ালে চুমা দিলো।', roastSelf1: 'নিজের লেজ খাইয়া ফেললা? এত ক্ষুধা?',
  roastSelf2: 'শত্রু লাগে না, তুমি নিজেই যথেষ্ট।', roastSelf3: 'নিজের সাথেই মারামারি? থামো ভাই।',
  roastSelf4: 'এত লম্বা হইলা, নিজের লেজ চিনো না?', roastSelf5: 'গিঁট্টু লাইগা গেছে! এখন খুলবে কে?',
  roastTraffic1: 'জ্যামে মরলা! ঢাকায় স্বাগতম।', roastTraffic2: 'বাস কি তোমারে সাইড দিবো ভাবছিলা?',
  roastBest1: 'নতুন রেকর্ড! আজকে ভাত বেশি খাইছো নাকি?', roastBest2: 'এই তো! এবার স্ক্রিনশট দিয়া সবাইরে জ্বালাও।',
  roastGhost1: 'ভূতের কাছেও হাইরা গেলা?', roastGhost2: 'ভূত তোমারে ধুইয়া দিল।',
  chaosPower: 'কারেন্ট গেলো! আবার?', chaosTraffic: 'সামনে জ্যাম! বাস আসতেছে!',
  chaosFlood: 'বৃষ্টি হইলো, রাস্তায় পানি!', chaosWedding: 'বিয়ে বাড়ি! বিরিয়ানি খাও!',
  foodFuchka: 'ফুচকায় ঝাল কম হইছে!', foodJhal: 'ঝালমুড়ি! ঝাল বেশি দিয়েন মামা!',
  foodRosho: 'রসগোল্লা! ডায়েট কাল থেকে।', foodIlish: 'ইলিশ! আজকে কপাল ভালো।',
  foodBiryani: 'বিরিয়ানি! আরেক প্লেট দেন মামা!', speedUp: 'গতি বাড়তেছে, সাবধান!',
  bite10: 'দশটা শেষ! পেট ভরে নাই?', bite20: 'বিশটা! সাপ তো হাতি হয়ে গেলো!',
  bite30: 'ত্রিশ! তুমি কি মানুষ?', startDaily: 'আজকের চ্যালেঞ্জ! পুরা দেশ দেখতেছে।',
  startChaos: 'ঢাকায় স্বাগতম! সাবধানে চালাও।', startGhost: 'ভূত রেডি! দৌড় দাও!',
  closeCall1: 'অল্পের জন্য বাঁচলা!',
  closeCall2: 'আরেকটু হইলেই শেষ ছিল!', chaosPowerBack: 'কারেন্ট আসছে! বাঁচলাম!',
  chaosTrafficEnd: 'জ্যাম ছুটছে, টান দাও!', chaosFloodEnd: 'পানি নামছে! রিকশাওয়ালা মামা চাকা খুঁজে পাইছে।',
  chaosWeddingEnd: 'বিরিয়ানি শেষ! দাওয়াত খতম।', chaosSlip: 'সাঁতার জানো তো?',
  roastZero: 'একটাও খাইতে পারলা না?', roastGhostWon: 'ভূতরে হারাইলা! সাবাশ!',
  roastGhostTie: 'ভূতের সাথে ড্র! ভূতও অবাক।', roastFull: 'পুরা মাঠ ভইরা গেছে! আর জায়গা নাই, তুমিই জিতছো!',
  momGone: 'আম্মু গেছে! চলো আবার!', kalNagini: 'কালনাগিনী আসছে! সবাই সরে দাঁড়াও!'
});
export const phrasesEn = Object.freeze({
  ...Object.fromEntries(Object.entries(SCENE).map(([key, pair]) => [key, pair[1]])),
  ...Object.fromEntries(Object.entries(adventureVoices).map(([key, pair]) => [key, pair[1]])),
  start: "Let's go, game on!", eat: 'Ooh yeah!', combo: 'On a streak! No stopping now!',
  help: 'Help! Somebody save me!', run: 'Run for it!',
  roastWall1: "The wall didn't move, bro.", roastWall2: 'Done already? Was that a trailer?',
  roastWall3: 'Where are you looking? At your phone?', roastWall4: 'Going so well, did you fall in love with the wall?',
  roastWall5: 'Where are the brakes? A bus drives better than this.', roastWall6: 'All that hard work, ruined in one crash!',
  roastWall7: 'Everyone saw that. The snake just kissed the wall.', roastSelf1: 'Ate your own tail? That hungry?',
  roastSelf2: 'Who needs enemies when you play like that?', roastSelf3: 'Fighting yourself? Take a break, bro.',
  roastSelf4: 'You got so long, you forgot your own tail?', roastSelf5: "Tied in a knot! Who's untangling that?",
  roastTraffic1: 'Stuck in traffic! Welcome to Dhaka.', roastTraffic2: 'Did you think the bus would give way?',
  roastBest1: 'New record! Extra rice at lunch today?', roastBest2: "That's it! Now go flex that screenshot.",
  roastGhost1: 'Lost to a ghost? Seriously?', roastGhost2: 'The ghost completely schooled you.',
  chaosPower: 'Power cut! Again?', chaosTraffic: 'Traffic jam ahead! Watch for buses!',
  chaosFlood: 'Flash flood! Water on the road!', chaosWedding: 'Wedding feast! Eat the biryani!',
  foodFuchka: 'Fuchka! Needs more spice!', foodJhal: 'Jhalmuri! Make it extra spicy!',
  foodRosho: 'Rosogolla! Diet starts tomorrow.', foodIlish: 'Ilish fish! Today is your lucky day.',
  foodBiryani: 'Biryani! Another plate, please!', speedUp: 'Speeding up, careful!',
  bite10: 'Ten down! Still hungry?', bite20: 'Twenty! Snake turned into an elephant!',
  bite30: 'Thirty! Are you even human?', startDaily: "Today's challenge! The whole country is watching.",
  startChaos: 'Welcome to Dhaka! Drive carefully.', startGhost: 'Ghost is ready! Run!',
  closeCall1: 'Close call!',
  closeCall2: 'That was inches from disaster!', chaosPowerBack: 'Power is back! We survived!',
  chaosTrafficEnd: 'Traffic cleared, floor it!', chaosFloodEnd: "Water's draining! The rickshaw uncle found his wheels again.",
  chaosWeddingEnd: "Biryani is gone! Party's over.", chaosSlip: 'Hope you know how to swim!',
  roastZero: 'Not even a single bite?', roastGhostWon: 'You beat the ghost! Well done!',
  roastGhostTie: "Tied with a ghost! Even it's shocked.", roastFull: "The board is full! There's no room left, so you win!",
  momGone: 'Mom left! Back to the game!', kalNagini: 'Kal Nagini has arrived! Clear the way!'
});
export const reactions = Object.freeze({
  ...Object.fromEntries(Object.keys(adventureVoices).map(key => [key, [key]])),
  ...sceneReactions,
  start: ['start'], combo: ['combo', 'eat'], danger: ['closeCall1', 'closeCall2', 'run'],
  roastWallLow: ['roastWall1', 'roastWall2', 'roastWall3'], roastWallMid: ['roastWall4', 'roastWall5', 'roastWall1'], roastWallHigh: ['roastWall6', 'roastWall7'],
  roastSelfLow: ['roastSelf1', 'roastSelf2', 'roastSelf3'], roastSelfHigh: ['roastSelf4', 'roastSelf5', 'roastSelf2'], roastTraffic: ['roastTraffic1', 'roastTraffic2'],
  roastBest: ['roastBest1', 'roastBest2'], roastGhost: ['roastGhost1', 'roastGhost2'],
  loadshedding: ['chaosPower'], traffic: ['chaosTraffic', 'help'], flood: ['chaosFlood'], wedding: ['chaosWedding'],
  loadsheddingEnd: ['chaosPowerBack'], trafficEnd: ['chaosTrafficEnd'], floodEnd: ['chaosFloodEnd'], weddingEnd: ['chaosWeddingEnd'], slip: ['chaosSlip'],
  roastZero: ['roastZero'], roastGhostWon: ['roastGhostWon'], roastGhostTie: ['roastGhostTie'], roastFull: ['roastFull'],
  foodFuchka: ['foodFuchka'], foodJhal: ['foodJhal'], foodRosho: ['foodRosho'], foodIlish: ['foodIlish'], foodBiryani: ['foodBiryani'],
  speedUp: ['speedUp'], bite10: ['bite10'], bite20: ['bite20'], bite30: ['bite30'],
  startDaily: ['startDaily'], startChaos: ['startChaos'], startGhost: ['startGhost'], momGone: ['momGone'], kalNagini: ['kalNagini'], help: ['help']
});
export const themed = (bank, theme) => reactions[`${bank}_${theme}`] ? `${bank}_${theme}` : bank;
// Every spoken line answers something that just happened. These are pure so each scenario can be tested.
export function roastBank({ reason, score = 0, newBest = false, ghost = null, theme = 'dhaka' } = {}) {
  if (reason === 'board-full' || reason === 'limit') return 'roastFull';
  if (ghost === 'won') return 'roastGhostWon';
  if (ghost === 'tie') return 'roastGhostTie';
  if (ghost === 'lost') return 'roastGhost';
  if (newBest) return 'roastBest';
  if (score === 0) return 'roastZero';
  if (reason === 'traffic') return themed('roastTraffic', theme);
  if (reason === 'self') return score >= 10 ? 'roastSelfHigh' : 'roastSelfLow';
  return score >= 20 ? 'roastWallHigh' : score >= 5 ? 'roastWallMid' : 'roastWallLow';
}
export function resultBank(run) {
  if (!run.adventure) return roastBank(run);
  if (run.reason === 'story-complete') return `win_${run.theme}`;
  if (run.reason === 'tiger') return 'caught_sundarbans';
  if (run.reason === 'traffic' && run.theme === 'dhaka') return 'caught_dhaka';
  if (run.reason === 'wall' && ['rooftop', 'coxs'].includes(run.theme)) return `caught_${run.theme}`;
  return roastBank({ ...run, score: Math.max(1, run.score ?? 0), newBest: false, ghost: null });
}
export function adventureReaction(event) {
  const { phase, theme, skin } = event;
  if (phase === 'warn') return { bank: `warn_${theme}`, priority: 100, force: true };
  if (phase === 'active' && theme !== 'rooftop') return { bank: `active_${theme}`, priority: 90, force: theme === 'sundarbans' };
  if (phase === 'chapter' && [1, 2].includes(event.chapter)) return { bank: `chapter_${theme}_${event.chapter}`, priority: 80, force: true };
  if (phase === 'rescued' && theme === 'rooftop') return { bank: 'collect_rooftop', priority: 70, force: true };
  if (phase === 'treat' && theme !== 'rooftop') return { bank: `collect_${theme}`, priority: 70, force: true };
  if (phase === 'stolen' && theme === 'rooftop') return { bank: 'stolen_rooftop', priority: 70, force: true };
  if (phase === 'gift' && theme !== 'rooftop') return { bank: `gift_${theme}`, priority: 50, force: false };
  if (phase === 'trait') return { bank: skin === 'jersey' ? 'goal_jersey' : `trait_${skin}`, priority: 60, force: skin === 'jersey' };
  return null;
}
export function biteBank({ apples, points = 1, feast = false, kind = 0, arcade = false }) {
  if (feast) return 'foodBiryani';
  if ([10, 20, 30].includes(apples)) return `bite${apples}`;
  if (apples % 5 === 0) return 'speedUp';
  if (arcade && points >= 3) return 'combo';
  return ['foodFuchka', 'foodJhal', 'foodRosho', 'foodIlish'][kind];
}
export function startBank({ adventure = false, style = 'classic', skin = 'nagin', theme = 'dhaka' } = {}) {
  if (style === 'daily') return 'startDaily';
  if (adventure) return `intro_${theme}_${skin}`;
  if (skin === 'kalnagini') return 'kalNagini';
  if (style === 'chaos') return themed('startChaos', theme);
  if (style === 'ghost') return 'startGhost';
  if (style === 'daily') return 'startDaily';
  return 'start';
}
// A reaction to an actual escape, not a prediction that changes the game rules.
export function escapedDanger(previous, game, id = 0) {
  const old = previous?.snakes[id]?.body, snake = game?.snakes[id];
  if (game?.status !== 'playing' || !snake?.alive || !old || old.length < 2) return false;
  const head = old[0], neck = old[1], current = snake.body[0];
  const dx = head.x - neck.x, dy = head.y - neck.y;
  const mx = current.x - head.x, my = current.y - head.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1 || Math.abs(mx) + Math.abs(my) !== 1 || (mx === dx && my === dy)) return false;
  const occupied = new Set(previous.snakes.flatMap(s => s.body.slice(0, -1)).map(p => `${p.x},${p.y}`));
  for (let n = 1; n <= 2; n++) {
    const x = head.x + dx * n, y = head.y + dy * n;
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || occupied.has(`${x},${y}`)) return true;
  }
  return false;
}
// Fully decoded before use, so speech starts on the instant, never buffers mid-word, and needs no network once cached.
class DecodedClip {
  constructor(context, url) { this.context = context; this.url = url; this.buffer = null; this.loading = null; this.source = null; this.paused = true; this.ended = false; this.currentTime = 0; this.volume = 1; this.onended = null; this.onerror = null; }
  load() {
    this.loading ??= fetch(this.url, { signal: AbortSignal.timeout(20000) })
      .then(response => { if (!response.ok) throw new Error('Clip unavailable'); return response.arrayBuffer(); })
      .then(bytes => this.context.decodeAudioData(bytes))
      .then(buffer => { this.buffer = buffer; })
      .catch(error => { this.loading = null; throw error; });
    return this.loading;
  }
  play() {
    // A clip that arrives late is dropped, because a reaction to a moment already gone sounds broken.
    if (!this.buffer) { this.load().catch(() => {}); return Promise.reject(new Error('Clip not ready')); }
    if (this.context.state !== 'running') this.context.resume().catch(() => {});
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.buffer; gain.gain.value = this.volume; source.connect(gain); gain.connect(this.context.destination);
    source.onended = () => {
      source.disconnect(); gain.disconnect();
      if (this.source !== source) return;
      this.source = null; this.paused = true; this.ended = true; this.onended?.();
    };
    // A short lead lets the music finish ducking before the first syllable.
    source.start(this.context.currentTime + .05);
    this.source = source; this.paused = false; this.ended = false;
    return Promise.resolve();
  }
  pause() {
    const source = this.source; this.source = null; this.paused = true;
    if (source) { try { source.stop(); } catch { /* Already finished. */ } }
  }
}
export class GameAudio {
  constructor(settings, caption, lang = 'bn') {
    this.settings = settings; this.caption = caption; this.lang = lang; this.context = null; this.active = false;
    this.clipsBn = new Map(); this.clipsEn = new Map(); this.clips = this.clipsBn; this.priority = []; this.currentPriority = 0;
    this.rotation = new Map(); this.lastLine = null; this.playbackId = 0; this.current = null; this.lastVoice = -Infinity; this.musicBuffer = null; this.musicSource = null; this.musicGain = null; this.musicLoading = null; this.musicFailed = false;
  }
  setLanguage(lang = 'bn') {
    this.lang = lang === 'en' ? 'en' : 'bn';
    this.clips = this.lang === 'en' ? this.clipsEn : this.clipsBn;
    if (this.context && this.settings.voice) {
      this.initClips();
      this.loadVoices();
    }
  }
  setAdventure(theme, skin) {
    this.priority = [`intro_${theme}_${skin}`, `warn_${theme}`, `trait_${skin}`, `caught_${theme}`, `gift_${theme}`, `chapter_${theme}_1`, `chapter_${theme}_2`, `win_${theme}`];
  }
  initClips() {
    if (!this.context) return;
    const target = this.lang === 'en' ? this.clipsEn : this.clipsBn;
    const prefix = this.lang === 'en' ? '/audio/en' : '/audio';
    const ver = this.lang === 'en' ? 'adventure-en-4' : 'adventure-bn-6';
    for (const name of Object.keys(phrases)) {
      if (!target.has(name)) target.set(name, new DecodedClip(this.context, `${prefix}/${name}.mp3?v=${ver}`));
    }
    this.clips = target;
  }
  unlock() {
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
    } catch { /* Sound is optional when a browser cannot create an audio context. */ }
    if (this.context && this.settings.voice) {
      this.initClips();
      this.voicesReady = this.loadVoices();
    } else this.voicesReady = Promise.resolve();
    this.musicFailed = false;
    if (this.settings.music) this.loadMusic();
  }
  // Three at a time keeps a weak connection responsive. Failed clips retry on the next unlock or play.
  async loadVoices() {
    const order = [...this.priority, ...Object.keys(phrases).filter(name => !this.priority.includes(name))];
    const queue = order.map(name => this.clips.get(name)).filter(clip => clip && !clip.buffer);
    const worker = async () => { while (queue.length) await queue.shift().load().catch(() => {}); };
    await Promise.all([worker(), worker(), worker()]);
  }
  tone(frequency, duration = .1, type = 'sine', volume = .06, end = frequency) {
    const c = this.context;
    if (!c || c.state !== 'running') return;
    const o = c.createOscillator(), gain = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(.001, t); gain.gain.linearRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    o.connect(gain); gain.connect(c.destination); o.start(); o.stop(t + duration + .01);
  }
  effect(name) {
    if (this.settings.effects && !document.hidden) {
      if (name === 'eat') { this.tone(660, .11, 'triangle', .08, 990); }
      else if (name === 'crash') this.tone(150, .22, 'sawtooth', .035, 40);
      else if (name === 'count') this.tone(440, .08, 'sine', .05);
      else if (name === 'go') this.tone(880, .18, 'triangle', .07);
    }
  }
  voice(name, force = false, priority = 0) {
    const options = reactions[name];
    if (!options || !this.settings.voice || document.hidden) return false;
    if (this.current && !this.current.paused && !this.current.ended && priority < this.currentPriority) return false;
    const now = performance.now();
    if (!force && (now - this.lastVoice < 6500 || (this.current && !this.current.paused && !this.current.ended))) return false;
    return this.play(this.pick(name), priority);
  }
  pick(name) {
    const options = reactions[name];
    let index = this.rotation.get(name) ?? 0;
    if (options.length > 1 && options[index % options.length] === this.lastLine) index++;
    const line = options[index % options.length];
    this.rotation.set(name, index + 1); this.lastLine = line;
    return line;
  }
  phrase(line) {
    return this.lang === 'en' ? (phrasesEn[line] ?? phrases[line]) : phrases[line];
  }
  play(line, priority = 0) {
    const clip = this.clips.get(line);
    if (!clip || !this.settings.voice || document.hidden) return false;
    this.lastVoice = performance.now();
    this.stopVoice();
    this.current = clip; this.currentPriority = priority; clip.currentTime = 0; clip.volume = 1;
    const playbackId = this.playbackId;
    this.caption(this.phrase(line), Math.max(6500, (clip.buffer?.duration ?? 5) * 1000 + 750)); this.duckMusic(true);
    const finished = () => {
      if (playbackId !== this.playbackId) return;
      this.current = null; this.currentPriority = 0; this.duckMusic(false);
    };
    clip.onended = finished;
    clip.onerror = () => {
      if (playbackId !== this.playbackId) return;
      finished(); // The caption already carries the line when its audio is missing.
    };
    clip.play().catch(clip.onerror);
    return true;
  }
  stopVoice() {
    this.playbackId++;
    if (this.current) { this.current.pause(); this.current.currentTime = 0; }
    this.current = null; this.currentPriority = 0; this.duckMusic(false);
  }
  async loadMusic() {
    if (this.musicBuffer) return this.musicBuffer;
    if (!this.context || this.musicFailed) return null;
    if (!this.musicLoading) {
      // Music must not wait for the whole voice library, which can outlast a short run.
      this.musicLoading = fetch('/audio/pungi-loop.wav?v=nagin-been-2', { signal: AbortSignal.timeout(30000) })
        .then(response => { if (!response.ok) throw new Error('Music unavailable'); return response.arrayBuffer(); })
        .then(bytes => this.context.decodeAudioData(bytes))
        .then(buffer => { this.musicBuffer = buffer; return buffer; })
        .catch(() => {
          this.musicFailed = true; this.musicLoading = null;
          return null;
        });
    }
    return this.musicLoading;
  }
  async startMusic() {
    if (!this.context || !this.active || !this.settings.music || document.hidden || this.musicSource) return;
    const buffer = await this.loadMusic();
    // A download may finish after pause, mute, or a tab switch.
    if (!buffer || !this.active || !this.settings.music || document.hidden || this.musicSource) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true;
    gain.gain.value = 0; source.connect(gain); gain.connect(this.context.destination);
    this.musicSource = source; this.musicGain = gain;
    this.duckMusic(!!this.current && !this.current.paused && !this.current.ended);
    source.start();
  }
  duckMusic(ducked) {
    if (!this.musicGain || !this.context) return;
    this.musicGain.gain.setTargetAtTime(ducked ? .07 : .30, this.context.currentTime, .08);
  }
  stopMusic() {
    if (!this.musicSource) return;
    const source = this.musicSource, gain = this.musicGain, t = this.context.currentTime;
    gain.gain.cancelScheduledValues(t); gain.gain.setTargetAtTime(0, t, .015);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.stop(t + .08); this.musicSource = null; this.musicGain = null;
  }
  setActive(active) {
    const wasActive = this.active;
    this.active = active;
    if (!active || document.hidden) {
      this.stopMusic();
      // Repeated inactive updates must let the result reaction finish.
      if (wasActive || document.hidden) this.stopVoice();
      return;
    }
    if (this.settings.music) this.startMusic();
    else this.stopMusic();
  }
  update() {
    if (!this.settings.voice) { this.stopVoice(); this.caption(''); }
    this.setActive(this.active);
  }
  stop() { this.setActive(false); this.stopVoice(); this.caption(''); }
}
