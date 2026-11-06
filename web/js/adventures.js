// Original bilingual stories and deterministic gameplay settings.
export const storyText = (pair, language = 'bn') => pair?.[language === 'bn' ? 0 : 1] ?? '';
export const STORY_GOALS = Object.freeze([5, 12, 20]);
export const WORLDS = Object.freeze({
  dhaka: {
    title: ['শেষ বাসের আগে চা', 'Tea before the last bus'], food: 0, encounter: 'bus',
    story: ['চায়ের দোকানের মামা একা পড়ে গেছে! পাড়ার আড্ডায় ২০টা ফুচকা পৌঁছে দাও। বাসের লেন লাল হলে সরে যাও; বাস চলে গেলে মামার চা তোমার।', 'The tea-stall uncle needs a hand. Deliver 20 fuchka to the neighbourhood adda. Leave the red bus lane before the bus arrives; a safe crossing earns a cup of tea.'],
    rule: ['চলন্ত বাসে ধাক্কা লাগলে শেষ। লাল লেন আগেই সাবধান করে।', 'Moving buses are solid. The red lane warns you before they arrive.'],
    warning: ['বাস আসছে! লাল লেন ছাড়ো, হিরো হইও না!', 'Bus incoming! Clear the red lane. Heroics are not a helmet!'],
    active: ['বাস যাচ্ছে! রাজা সাহেবকে আগে যেতে দাও!', 'Bus crossing! Let his majesty through!'],
    reward: ['মামার চা এসেছে! সোনালি কাপটা তুলে নাও।', "Uncle's tea is ready! Grab the golden cup before it gets cold."],
    chapters: [['প্রথম আড্ডায় ফুচকা পৌঁছেছে! এবার গলির শেষ মাথা।', 'First adda served! The next hungry crew is down the lane.'], ['মামার দোকানে ভিড়! আর আটটা, তারপর ছুটি।', 'The stall is buzzing! Eight more deliveries, then a well-earned break.']],
    ending: ['পাড়ার আড্ডা জমে গেছে। মামা বলল, “আজকের চা আমার!”', 'The whole neighbourhood is fed. Uncle grins: “Tea is on me today!”'],
    death: ['বাসের সাথে পাল্লা দিতে নেই, ভাই!', 'Never race a Dhaka bus, little snake!'],
  },
  rooftop: {
    title: ['ছাদের মিষ্টি চোর', 'The rooftop sweet thief'], food: 2, encounter: 'pigeon',
    story: ['নানুর ছাদের ঘুড়ি উৎসবে ২০টা রসগোল্লা চাই। দুষ্টু কবুতর মিষ্টি দেখলেই ঝাঁপ দেয়! হলুদ দাগের মিষ্টিটা আগে খেয়ে বাঁচাও, বাড়তি ৩ পয়েন্ট নাও।', "Nanu's kite party needs 20 roshogolla. A cheeky pigeon keeps eyeing the sweets! Reach the yellow-marked sweet before it swoops and earn 3 extra points."],
    rule: ['কবুতর তোমাকে মারে না; সময় ফুরোলে খাবার চুরি করে।', 'The pigeon steals food rather than hurting you. Beat its countdown.'],
    warning: ['কবুতর মিষ্টি চায়! হলুদ ঘরে আগে যাও, ওর বাকির খাতা নাই!', 'Pigeon eyes on the prize! Reach the yellow sweet first. It does not do IOUs!'],
    active: ['কবুতর মিষ্টি নিয়ে পালালো! পরেরটা বাঁচাও।', 'The pigeon pinched it! Save the next sweet.'],
    reward: ['মিষ্টি বাঁচল! কবুতর এখন নানুর কাছে নালিশ দেবে!', 'Sweet saved! That pigeon wants to speak to your manager.'],
    chapters: [['প্রথম ঘুড়ি উঠেছে! নানু আরও মিষ্টি চায়।', 'The first kite is up! Nanu orders another plate.'], ['ছাদভরা হাসি। শেষ আটটা মিষ্টি বাকি!', 'The rooftop is full of laughter. Just eight sweets to go!']],
    ending: ['ঘুড়ি উড়ছে, সবাই মিষ্টি খাচ্ছে। কবুতরকেও একটা দিলে!', 'Kites in the sky, sweets for everyone. You even saved one for the pigeon!'],
    death: ['মিষ্টির তাড়ায় ছাদের কিনারা ভুলে গেলে!', 'Too busy chasing sweets to watch the rooftop edge!'],
  },
  coxs: {
    title: ['জোয়ারের আগে বনভোজন', 'Picnic before the tide'], food: 3, encounter: 'tide',
    story: ['জেলেদের বনভোজনে ২০টা ইলিশ পৌঁছে দাও। নীল ঢেউয়ে ঢুকলে শুকনো বালি পর্যন্ত সোজা ভাসবে। ঢেউ নামলে কাঁকড়া একটা মুক্তা রেখে যায়—সোনালি মুক্তাটা খুঁজে নাও!', "Bring 20 ilish to the fishers' picnic. Blue tidewater carries you straight until dry sand. When the wave retreats, a friendly crab leaves a pearl. Find the golden pearl!"],
    rule: ['নীল পানিতে মোড় নেওয়া যায় না। আগে থেকেই পথ ঠিক করো।', 'You cannot turn in blue water. Plan your exit before entering.'],
    warning: ['জোয়ার আসছে! নীল পানিতে সোজা ভাসবে, সাঁতারের ক্লাস এখন না!', 'Tide coming! Blue water carries you straight. Swimming lessons can wait!'],
    active: ['পানিতে সোজা চলো। সাপের স্টিয়ারিং এখন ছুটিতে!', 'Straight through the water. Your steering wheel is on holiday!'],
    reward: ['কাঁকড়া মুক্তা রেখে গেছে! কুড়িয়ে নাও, রসিদ লাগবে না।', 'The crab left a pearl! Grab it. No receipt needed.'],
    chapters: [['প্রথম নৌকা ফিরে এসেছে! বনভোজন জমছে।', 'The first boat is home! The picnic is coming together.'], ['চুলায় মাছ, সৈকতে গান। আর আটটা ইলিশ!', 'Fish on the stove, songs on the sand. Eight ilish to go!']],
    ending: ['সব নৌকা ফিরেছে। সৈকতের বনভোজনে তোমার জন্য সেরা জায়গা!', 'Every boat is home. You have the best seat at the beach picnic!'],
    death: ['ঢেউ পেরিয়ে বেঁচেছিলে, কিনারাটা খেয়াল করলে না!', 'You rode the tide, then forgot to watch the edge!'],
  },
  sundarbans: {
    title: ['বাঘ মামার বনভোজন', "Tiger uncle's picnic"], food: 1, encounter: 'tiger',
    story: ['বাঘ মামার পেট গুড়গুড়! বনের বন্ধুদের জন্য ২০টা ঝালমুড়ি জোগাড় করো। মামা তোমাকে ধরতে লাল থাবার পথে ঝাঁপ দেবে। দাগ ছেড়ে পালাও, তারপর তার রেখে যাওয়া মধু নাও!', "Tiger uncle has a rumbling tummy! Gather 20 jhalmuri for the forest picnic. He stalks you, marks a red paw trail, then pounces. Dodge the trail and collect the honey he leaves behind!"],
    rule: ['বাঘ সত্যিই ঝাঁপ দেয়। লাল থাবার পথ এড়িয়ে চলো।', 'The tiger really pounces. Stay off the red paw trail.'],
    warning: ['বাঘ মামা ওত পেতেছে! লাল থাবা ছাড়ো, মামার কোলে যেয়ো না!', 'Tiger uncle is stalking you! Leave the red trail. No cuddles today!'],
    active: ['ঝাঁপ! মামা দেখি অলিম্পিকের ট্রায়াল দিচ্ছে!', 'Pounce! Uncle thinks this is the Olympics!'],
    reward: ['বাঘ মামা মধু ফেলে গেছে! সাবধানে তুলে নাও।', 'Tiger uncle dropped his honey! Finders keepers, little snake.'],
    chapters: [['হরিণের দল এসে গেছে। বাঘ মামা এখনও ক্ষুধার্ত!', 'The deer have arrived. Tiger uncle is still hungry!'], ['বানররা পাতা বিছিয়েছে। আর আট ঠোঙা ঝালমুড়ি!', 'The monkeys have laid the leaves. Eight jhalmuri to go!']],
    ending: ['বাঘ, হরিণ, কুমির—সবাই একসাথে খাচ্ছে। আজ তুমি বনের প্রিয় অতিথি!', "Tiger, deer and crocodile share a picnic. Today you're the forest's favourite guest!"],
    death: ['বাঘ মামা ধরে ফেলেছে! পরেরবার লাল থাবা দেখো।', 'Tiger uncle caught you! Watch the red paw trail next time.'],
  },
});

export const TRAITS = Object.freeze({
  nagin: { title: ['গলির ওস্তাদ', 'Streetwise'], description: ['প্রতিটি বিপদ পেরোলে বা মিষ্টি বাঁচালে বাড়তি ২ পয়েন্ট।', 'Earn 2 extra points for a clean dodge, a tide survived, or a sweet rescued.'], voice: ['গলির ওস্তাদ! ফাঁকি দিলেই বকশিশ!', 'Streetwise! Every clean dodge earns a tip!'] },
  kalnagini: { title: ['সতর্ক ফণা', 'Watchful hood'], description: ['বাস, বাঘ, কবুতর আর জোয়ারের আগাম সতর্কতা ৬ চাল বেশি থাকে।', 'Get 6 extra warning steps before buses, tigers, pigeons and tides.'], voice: ['কালনাগিনীর ফণা সব টের পায়। সাবধান হওয়ার সময় বেশি!', "Kal Nagini's hood senses trouble. More time to get ready!"] },
  tiger: { title: ['মিষ্টি শিকারি', 'Treat hunter'], description: ['সোনালি উপহার আর বাঁচানো মিষ্টিতে বাড়তি ২ পয়েন্ট।', 'Golden gifts and rescued sweets earn 2 extra points.'], voice: ['ডোরাকাটা ওস্তাদ! উপহার খুঁজলেই বাড়তি লাভ!', 'Tiger Stripe! A nose for treats and extra points!'] },
  tea: { title: ['ধীরে চলো, চা খাও', 'Take it tea-sy'], description: ['১২% ধীরে চলে। ভাবার সময় বেশি, খাবারের পয়েন্ট একই।', 'Move 12% slower. More thinking time, the same food points.'], voice: ['চায়ের সাপ তাড়াহুড়া করে না। ধীরে চলো, দূরে চলো!', 'Tea-Stall Snake takes its time. Slow and steady, little buddy!'] },
  jersey: { title: ['হ্যাটট্রিক', 'Hat-trick'], description: ['প্রতি তৃতীয় খাবার পৌঁছালে বাড়তি ১ পয়েন্ট। গোল!', 'Every third delivery earns 1 extra point. Goal!'], voice: ['জার্সি সাপ! তিন খাবার পরই হ্যাটট্রিক, গোলের জন্য তৈরি?', 'Jersey Snake! Three deliveries make a hat-trick. Ready to score?'] },
});

const NAMES = { nagin: ['রিকশা নাগিন', 'Rickshaw Nagin'], kalnagini: ['কালনাগিনী', 'Kal Nagini'], tiger: ['ডোরাকাটা সাপ', 'Tiger Stripe'], tea: ['চায়ের সাপ', 'Tea-Stall Snake'], jersey: ['জার্সি সাপ', 'Jersey Snake'] };
const INTRO = { dhaka: ['ঢাকার মামার ফুচকা পৌঁছে দাও। বাস থেকে সাবধান!', "Deliver uncle's fuchka in Dhaka. Watch those buses!"], rooftop: ['নানুর ছাদের মিষ্টি বাঁচাও। কবুতর কিন্তু চালাক!', "Save Nanu's rooftop sweets. That pigeon is sneaky!"], coxs: ['সৈকতে বনভোজন! জোয়ার দেখে ইলিশ পৌঁছে দাও!', 'Beach picnic! Deliver the ilish and watch the tide!'], sundarbans: ['বনের বনভোজন শুরু! বাঘ মামার থাবা দেখে চলো!', "Forest picnic! Watch out for tiger uncle's paws!"] };
export const adventureVoices = {};
const COLLECT = {
  dhaka: ['চা পেটে গেছে! মামা বলল, কাপটা কিন্তু ফেরত দিও!', 'Tea collected! Uncle says the cup is not a souvenir.'],
  rooftop: ['মিষ্টি উদ্ধার! নানু খুশি, কবুতরের মুখ ভার।', 'Sweet rescued! Nanu is happy. The pigeon demands a recount.'],
  coxs: ['মুক্তা পেয়েছো! কাঁকড়া এখন গয়নার দোকান খুলবে।', 'Pearl collected! That crab could open a jewellery shop.'],
  sundarbans: ['মধু খেয়েছো! বাঘ মামা এখন খালি বয়াম চাটবে।', 'Honey collected! Tiger uncle gets to lick the empty jar.'],
};
for (const [theme, world] of Object.entries(WORLDS)) {
  for (const [skin, name] of Object.entries(NAMES)) adventureVoices[`intro_${theme}_${skin}`] = [`${name[0]}! ${INTRO[theme][0]}`, `${name[1]}! ${INTRO[theme][1]}`];
  adventureVoices[`warn_${theme}`] = world.warning;
  adventureVoices[`gift_${theme}`] = world.reward;
  adventureVoices[`collect_${theme}`] = COLLECT[theme];
  if (theme !== 'rooftop') adventureVoices[`active_${theme}`] = world.active;
  adventureVoices[`win_${theme}`] = world.ending;
  adventureVoices[`caught_${theme}`] = world.death;
  world.chapters.forEach((line, index) => { adventureVoices[`chapter_${theme}_${index + 1}`] = line; });
}
adventureVoices.stolen_rooftop = ['কবুতর মিষ্টি চুরি করে উড়াল! ভাড়াও দিল না!', 'Pigeon stole the sweet and flew off. Did not even leave a tip!'];
adventureVoices.goal_jersey = ['তিন খাবার পৌঁছেছে! গোওওল! জার্সি সাপের হ্যাটট্রিক!', 'Three deliveries! Goooal! Jersey Snake scores a hat-trick!'];
for (const [skin, trait] of Object.entries(TRAITS)) adventureVoices[`trait_${skin}`] = trait.voice;

