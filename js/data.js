/* ------------------------------------------------------------------
   Japanese number reading generator (0 - 99,999)
   Builds both romaji and hiragana readings using the same rules
   native speakers use, including the sound changes (音便) that make
   this hard for learners: 100=ひゃく (not いちひゃく), 300=さんびゃく, 600=ろっぴゃく,
   800=はっぴゃく, 1000=せん (not いっせん), 3000=さんぜん, 8000=はっせん, etc.
------------------------------------------------------------------- */

const DIGIT_R = ['', 'ichi', 'ni', 'san', 'yon', 'go', 'roku', 'nana', 'hachi', 'kyuu'];
const DIGIT_H = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];

// Joins two romaji chunks, inserting the standard disambiguating apostrophe
// (as in "tan'i") when a trailing ん could otherwise be misread as merging
// with a following vowel/y — e.g. "sen"+"ichi" must stay "sen'ichi" (せんいち),
// not read as "se"+"ni"+"chi". Hiragana never has this ambiguity, so it's
// romaji-only.
function joinR(left, right) {
  if (left && /n$/.test(left) && /^[aiueoy]/.test(right)) return left + "'" + right;
  return left + right;
}

function readThousandsBlock(n, R) {
  // n is 0-9999, R = true for romaji, false for hiragana
  const D = R ? DIGIT_R : DIGIT_H;
  const juu = R ? 'juu' : 'じゅう';
  const join = R ? joinR : (a, b) => a + b;
  let out = '';

  const th = Math.floor(n / 1000);
  const hu = Math.floor((n % 1000) / 100);
  const te = Math.floor((n % 100) / 10);
  const on = n % 10;

  if (th > 0) {
    if (th === 1) out = join(out, R ? 'sen' : 'せん');
    else if (th === 3) out = join(out, R ? 'sanzen' : 'さんぜん');
    else if (th === 8) out = join(out, R ? 'hassen' : 'はっせん');
    else out = join(out, D[th] + (R ? 'sen' : 'せん'));
  }
  if (hu > 0) {
    if (hu === 1) out = join(out, R ? 'hyaku' : 'ひゃく');
    else if (hu === 3) out = join(out, R ? 'sanbyaku' : 'さんびゃく');
    else if (hu === 6) out = join(out, R ? 'roppyaku' : 'ろっぴゃく');
    else if (hu === 8) out = join(out, R ? 'happyaku' : 'はっぴゃく');
    else out = join(out, D[hu] + (R ? 'hyaku' : 'ひゃく'));
  }
  if (te > 0) {
    if (te === 1) out = join(out, juu);
    else out = join(out, D[te] + juu);
  }
  if (on > 0) out = join(out, D[on]);

  return out;
}

function numberToReading(n) {
  if (n === 0) return { romaji: 'zero', hiragana: 'ゼロ', kanji: '〇' };

  const man = Math.floor(n / 10000);
  const rest = n % 10000;

  let romaji = '';
  let hiragana = '';

  if (man > 0) {
    if (man === 1) {
      romaji = joinR(romaji, 'ichiman');
      hiragana += 'いちまん';
    } else {
      romaji = joinR(romaji, readThousandsBlock(man, true) + 'man');
      hiragana += readThousandsBlock(man, false) + 'まん';
    }
  }
  if (rest > 0) {
    romaji = joinR(romaji, readThousandsBlock(rest, true));
    hiragana += readThousandsBlock(rest, false);
  }

  return { romaji, hiragana, kanji: n.toLocaleString('en-US') };
}

// Explains *why* a number reads the way it does, if there's a sound change
// involved (300/600/800, 3000/8000, needing "ichi" for 10,000...). Returns
// null when the number is just straightforward digit-by-digit reading, so
// callers can fall back to their own "nothing special here" message.
function explainNumber(n) {
  const notes = [];
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  const th = Math.floor(rest / 1000);
  const hu = Math.floor((rest % 1000) / 100);

  if (hu === 3) notes.push('300s use さんびゃく — hyaku shifts to byaku after san.');
  if (hu === 6) notes.push('600s use ろっぴゃく — hyaku doubles into ppyaku after roku.');
  if (hu === 8) notes.push('800s use はっぴゃく — hyaku doubles into ppyaku after hachi.');
  if (th === 3) notes.push('3000s use さんぜん — sen shifts to zen after san.');
  if (th === 8) notes.push('8000s use はっせん — sen doubles into ssen after hachi.');
  if (man === 1) notes.push('10,000 needs the explicit ichi (いちまん) — unlike hyaku/sen, man doesn’t drop it.');

  return notes.length ? notes.join(' ') : null;
}

/* ------------------------------------------------------------------
   Counters (助数詞 josuushi)
   Each counter has readings for 1-10 as {romaji, hiragana}.
   `note` explains the sound-change pattern for that counter so the
   learner sees *why*, not just *what*.
------------------------------------------------------------------- */

const COUNTERS = [
  {
    id: 'tsu',
    kanji: 'つ',
    label: 'つ (tsu)',
    meaning: 'general objects (native Japanese numbers) — use when no specific counter fits',
    icon: '🔘',
    rank: 1,
    sentence: 'Could I get {n} of these, please?',
    note: 'Uses the old native Japanese number series, not the Sino-Japanese one. Irregular all the way through.',
    readings: [
      { romaji: 'hitotsu', hiragana: 'ひとつ' },
      { romaji: 'futatsu', hiragana: 'ふたつ' },
      { romaji: 'mittsu', hiragana: 'みっつ' },
      { romaji: 'yottsu', hiragana: 'よっつ' },
      { romaji: 'itsutsu', hiragana: 'いつつ' },
      { romaji: 'muttsu', hiragana: 'むっつ' },
      { romaji: 'nanatsu', hiragana: 'ななつ' },
      { romaji: 'yattsu', hiragana: 'やっつ' },
      { romaji: 'kokonotsu', hiragana: 'ここのつ' },
      { romaji: 'too', hiragana: 'とお' },
    ],
  },
  {
    id: 'nin',
    kanji: '人',
    label: '人 (nin)',
    meaning: 'people',
    icon: '🧑',
    rank: 2,
    sentence: 'There are {n} people in my family.',
    note: '1 and 2 are totally irregular words (hitori/futari). From 3 on it is X+nin — watch out, 4 is "yonin" (one n), not "yonnin".',
    readings: [
      { romaji: 'hitori', hiragana: 'ひとり' },
      { romaji: 'futari', hiragana: 'ふたり' },
      { romaji: 'sannin', hiragana: 'さんにん' },
      { romaji: 'yonin', hiragana: 'よにん' },
      { romaji: 'gonin', hiragana: 'ごにん' },
      { romaji: 'rokunin', hiragana: 'ろくにん' },
      { romaji: 'shichinin', hiragana: 'しちにん' },
      { romaji: 'hachinin', hiragana: 'はちにん' },
      { romaji: 'kyuunin', hiragana: 'きゅうにん' },
      { romaji: 'juunin', hiragana: 'じゅうにん' },
    ],
  },
  {
    id: 'ko',
    kanji: '個',
    label: '個 (ko)',
    meaning: 'small/general objects (apples, boxes, gadgets...)',
    icon: '🍎',
    rank: 3,
    sentence: 'Can I have {n} apples?',
    note: 'Gemination (small っ) before k: 1, 6, 8, 10 double the consonant.',
    readings: [
      { romaji: 'ikko', hiragana: 'いっこ' },
      { romaji: 'niko', hiragana: 'にこ' },
      { romaji: 'sanko', hiragana: 'さんこ' },
      { romaji: 'yonko', hiragana: 'よんこ' },
      { romaji: 'goko', hiragana: 'ごこ' },
      { romaji: 'rokko', hiragana: 'ろっこ' },
      { romaji: 'nanako', hiragana: 'ななこ' },
      { romaji: 'hakko', hiragana: 'はっこ' },
      { romaji: 'kyuuko', hiragana: 'きゅうこ' },
      { romaji: 'jukko', hiragana: 'じゅっこ' },
    ],
  },
  {
    id: 'hon',
    kanji: '本',
    label: '本 (hon/bon/pon)',
    meaning: 'long thin objects (bottles, pens, pencils, trees...)',
    icon: '🖊️',
    rank: 5,
    sentence: 'There are {n} pencils in the box.',
    note: 'h→p after っ (1,6,8,10), h→b after n (3), and stays h after vowels (2,5,7,9). Classic three-way alternation.',
    readings: [
      { romaji: 'ippon', hiragana: 'いっぽん' },
      { romaji: 'nihon', hiragana: 'にほん' },
      { romaji: 'sanbon', hiragana: 'さんぼん' },
      { romaji: 'yonhon', hiragana: 'よんほん' },
      { romaji: 'gohon', hiragana: 'ごほん' },
      { romaji: 'roppon', hiragana: 'ろっぽん' },
      { romaji: 'nanahon', hiragana: 'ななほん' },
      { romaji: 'happon', hiragana: 'はっぽん' },
      { romaji: 'kyuuhon', hiragana: 'きゅうほん' },
      { romaji: 'juppon', hiragana: 'じゅっぽん' },
    ],
  },
  {
    id: 'mai',
    kanji: '枚',
    label: '枚 (mai)',
    meaning: 'flat objects (paper, tickets, plates, shirts...)',
    icon: '📄',
    rank: 4,
    sentence: 'She bought {n} tickets.',
    note: 'Fully regular — no sound changes at all. A good one to build confidence on.',
    readings: [
      { romaji: 'ichimai', hiragana: 'いちまい' },
      { romaji: 'nimai', hiragana: 'にまい' },
      { romaji: 'sanmai', hiragana: 'さんまい' },
      { romaji: 'yonmai', hiragana: 'よんまい' },
      { romaji: 'gomai', hiragana: 'ごまい' },
      { romaji: 'rokumai', hiragana: 'ろくまい' },
      { romaji: 'nanamai', hiragana: 'ななまい' },
      { romaji: 'hachimai', hiragana: 'はちまい' },
      { romaji: 'kyuumai', hiragana: 'きゅうまい' },
      { romaji: 'juumai', hiragana: 'じゅうまい' },
    ],
  },
  {
    id: 'hiki',
    kanji: '匹',
    label: '匹 (hiki/biki/piki)',
    meaning: 'small animals (cats, dogs, bugs, fish...)',
    icon: '🐱',
    rank: 8,
    sentence: 'I saw {n} cats in the park.',
    note: 'Same h→p/b/h alternation pattern as 本 (hon).',
    readings: [
      { romaji: 'ippiki', hiragana: 'いっぴき' },
      { romaji: 'nihiki', hiragana: 'にひき' },
      { romaji: 'sanbiki', hiragana: 'さんびき' },
      { romaji: 'yonhiki', hiragana: 'よんひき' },
      { romaji: 'gohiki', hiragana: 'ごひき' },
      { romaji: 'roppiki', hiragana: 'ろっぴき' },
      { romaji: 'nanahiki', hiragana: 'ななひき' },
      { romaji: 'happiki', hiragana: 'はっぴき' },
      { romaji: 'kyuuhiki', hiragana: 'きゅうひき' },
      { romaji: 'juppiki', hiragana: 'じゅっぴき' },
    ],
  },
  {
    id: 'tou',
    kanji: '頭',
    label: '頭 (tou)',
    meaning: 'large animals (cows, horses, elephants...)',
    icon: '🐘',
    rank: 15,
    sentence: 'The zoo has {n} elephants.',
    note: 'Gemination before t: 1, 8, 10.',
    readings: [
      { romaji: 'ittou', hiragana: 'いっとう' },
      { romaji: 'nitou', hiragana: 'にとう' },
      { romaji: 'santou', hiragana: 'さんとう' },
      { romaji: 'yontou', hiragana: 'よんとう' },
      { romaji: 'gotou', hiragana: 'ごとう' },
      { romaji: 'rokutou', hiragana: 'ろくとう' },
      { romaji: 'nanatou', hiragana: 'ななとう' },
      { romaji: 'hattou', hiragana: 'はっとう' },
      { romaji: 'kyuutou', hiragana: 'きゅうとう' },
      { romaji: 'juttou', hiragana: 'じゅっとう' },
    ],
  },
  {
    id: 'satsu',
    kanji: '冊',
    label: '冊 (satsu)',
    meaning: 'bound objects (books, magazines, notebooks...)',
    icon: '📚',
    rank: 11,
    sentence: 'I borrowed {n} books from the library.',
    note: 'Gemination before s: 1, 8, 10.',
    readings: [
      { romaji: 'issatsu', hiragana: 'いっさつ' },
      { romaji: 'nisatsu', hiragana: 'にさつ' },
      { romaji: 'sansatsu', hiragana: 'さんさつ' },
      { romaji: 'yonsatsu', hiragana: 'よんさつ' },
      { romaji: 'gosatsu', hiragana: 'ごさつ' },
      { romaji: 'rokusatsu', hiragana: 'ろくさつ' },
      { romaji: 'nanasatsu', hiragana: 'ななさつ' },
      { romaji: 'hassatsu', hiragana: 'はっさつ' },
      { romaji: 'kyuusatsu', hiragana: 'きゅうさつ' },
      { romaji: 'jussatsu', hiragana: 'じゅっさつ' },
    ],
  },
  {
    id: 'kai_floor',
    kanji: '階',
    label: '階 (kai/gai) — floors',
    meaning: 'floor of a building',
    icon: '🏢',
    rank: 14,
    sentence: 'The elevator stopped on floor {n}.',
    note: 'Counter for floors: mostly kai, but 3 becomes "gai" (sangai) — a famous exception. "What floor?" = 何階 (nangai).',
    readings: [
      { romaji: 'ikkai', hiragana: 'いっかい' },
      { romaji: 'nikai', hiragana: 'にかい' },
      { romaji: 'sangai', hiragana: 'さんがい' },
      { romaji: 'yonkai', hiragana: 'よんかい' },
      { romaji: 'gokai', hiragana: 'ごかい' },
      { romaji: 'rokkai', hiragana: 'ろっかい' },
      { romaji: 'nanakai', hiragana: 'ななかい' },
      { romaji: 'hakkai', hiragana: 'はっかい' },
      { romaji: 'kyuukai', hiragana: 'きゅうかい' },
      { romaji: 'jukkai', hiragana: 'じゅっかい' },
    ],
  },
  {
    id: 'kai_times',
    kanji: '回',
    label: '回 (kai) — times',
    meaning: 'number of times / occurrences',
    icon: '🔁',
    rank: 12,
    sentence: "I've been to Japan {n} times.",
    note: 'Counter for occurrences — same gemination pattern as 個 (ko), no gai exception this time.',
    readings: [
      { romaji: 'ikkai', hiragana: 'いっかい' },
      { romaji: 'nikai', hiragana: 'にかい' },
      { romaji: 'sankai', hiragana: 'さんかい' },
      { romaji: 'yonkai', hiragana: 'よんかい' },
      { romaji: 'gokai', hiragana: 'ごかい' },
      { romaji: 'rokkai', hiragana: 'ろっかい' },
      { romaji: 'nanakai', hiragana: 'ななかい' },
      { romaji: 'hakkai', hiragana: 'はっかい' },
      { romaji: 'kyuukai', hiragana: 'きゅうかい' },
      { romaji: 'jukkai', hiragana: 'じゅっかい' },
    ],
  },
  {
    id: 'sai',
    kanji: '歳',
    label: '歳/才 (sai)',
    meaning: 'age (years old)',
    icon: '🎂',
    rank: 7,
    sentence: 'My little brother is {n} years old.',
    note: 'Regular X+sai gemination pattern (1,8,10) — except 20, which is the irregular word "hatachi", not "nijussai".',
    readings: [
      { romaji: 'issai', hiragana: 'いっさい' },
      { romaji: 'nisai', hiragana: 'にさい' },
      { romaji: 'sansai', hiragana: 'さんさい' },
      { romaji: 'yonsai', hiragana: 'よんさい' },
      { romaji: 'gosai', hiragana: 'ごさい' },
      { romaji: 'rokusai', hiragana: 'ろくさい' },
      { romaji: 'nanasai', hiragana: 'ななさい' },
      { romaji: 'hassai', hiragana: 'はっさい' },
      { romaji: 'kyuusai', hiragana: 'きゅうさい' },
      { romaji: 'jussai', hiragana: 'じゅっさい' },
    ],
    irregular20: { romaji: 'hatachi', hiragana: 'はたち' },
  },
  {
    id: 'en',
    kanji: '円',
    label: '円 (en)',
    meaning: 'yen (currency)',
    icon: '💴',
    rank: 6,
    sentence: 'This snack costs {n} yen.',
    note: 'Fully regular — no sound changes.',
    readings: [
      { romaji: 'ichien', hiragana: 'いちえん' },
      { romaji: 'nien', hiragana: 'にえん' },
      { romaji: "san'en", hiragana: 'さんえん' },
      { romaji: "yon'en", hiragana: 'よんえん' },
      { romaji: 'goen', hiragana: 'ごえん' },
      { romaji: 'rokuen', hiragana: 'ろくえん' },
      { romaji: 'nanaen', hiragana: 'ななえん' },
      { romaji: 'hachien', hiragana: 'はちえん' },
      { romaji: 'kyuuen', hiragana: 'きゅうえん' },
      { romaji: 'juuen', hiragana: 'じゅうえん' },
    ],
  },
  {
    id: 'fun',
    kanji: '分',
    label: '分 (fun/pun)',
    meaning: 'minutes',
    icon: '⏱️',
    rank: 10,
    sentence: 'The train leaves in {n} minutes.',
    note: 'f→p after っ (1,6,8,10), stays f otherwise. Same family as 本/匹.',
    readings: [
      { romaji: 'ippun', hiragana: 'いっぷん' },
      { romaji: 'nifun', hiragana: 'にふん' },
      { romaji: 'sanpun', hiragana: 'さんぷん' },
      { romaji: 'yonpun', hiragana: 'よんぷん' },
      { romaji: 'gofun', hiragana: 'ごふん' },
      { romaji: 'roppun', hiragana: 'ろっぷん' },
      { romaji: 'nanafun', hiragana: 'ななふん' },
      { romaji: 'happun', hiragana: 'はっぷん' },
      { romaji: 'kyuufun', hiragana: 'きゅうふん' },
      { romaji: 'juppun', hiragana: 'じゅっぷん' },
    ],
  },
  {
    id: 'hai',
    kanji: '杯',
    label: '杯 (hai/bai/pai)',
    meaning: 'cups/glasses of liquid',
    icon: '🥤',
    rank: 13,
    sentence: 'He drank {n} glasses of water.',
    note: 'Same h→p/b/h alternation as 本 and 匹.',
    readings: [
      { romaji: 'ippai', hiragana: 'いっぱい' },
      { romaji: 'nihai', hiragana: 'にはい' },
      { romaji: 'sanbai', hiragana: 'さんばい' },
      { romaji: 'yonhai', hiragana: 'よんはい' },
      { romaji: 'gohai', hiragana: 'ごはい' },
      { romaji: 'roppai', hiragana: 'ろっぱい' },
      { romaji: 'nanahai', hiragana: 'ななはい' },
      { romaji: 'happai', hiragana: 'はっぱい' },
      { romaji: 'kyuuhai', hiragana: 'きゅうはい' },
      { romaji: 'juppai', hiragana: 'じゅっぱい' },
    ],
  },
  {
    id: 'dai',
    kanji: '台',
    label: '台 (dai)',
    meaning: 'machines & vehicles (cars, computers, TVs...)',
    icon: '🚗',
    rank: 9,
    sentence: 'The dealership has {n} cars.',
    note: 'Fully regular — no sound changes.',
    readings: [
      { romaji: 'ichidai', hiragana: 'いちだい' },
      { romaji: 'nidai', hiragana: 'にだい' },
      { romaji: 'sandai', hiragana: 'さんだい' },
      { romaji: 'yondai', hiragana: 'よんだい' },
      { romaji: 'godai', hiragana: 'ごだい' },
      { romaji: 'rokudai', hiragana: 'ろくだい' },
      { romaji: 'nanadai', hiragana: 'ななだい' },
      { romaji: 'hachidai', hiragana: 'はちだい' },
      { romaji: 'kyuudai', hiragana: 'きゅうだい' },
      { romaji: 'juudai', hiragana: 'じゅうだい' },
    ],
  },
  {
    id: 'wa',
    kanji: '羽',
    label: '羽 (wa/ba/pa)',
    meaning: 'birds (and, oddly, rabbits)',
    icon: '🐦',
    rank: 16,
    sentence: 'There are {n} birds on the wire.',
    note: 'Same w→b/p alternation family as 本/匹/杯: w→b after n (3), w→p after っ (6,10), stays w after vowels.',
    readings: [
      { romaji: 'ichiwa', hiragana: 'いちわ' },
      { romaji: 'niwa', hiragana: 'にわ' },
      { romaji: 'sanba', hiragana: 'さんば' },
      { romaji: 'yonwa', hiragana: 'よんわ' },
      { romaji: 'gowa', hiragana: 'ごわ' },
      { romaji: 'roppa', hiragana: 'ろっぱ' },
      { romaji: 'nanawa', hiragana: 'ななわ' },
      { romaji: 'hachiwa', hiragana: 'はちわ' },
      { romaji: 'kyuuwa', hiragana: 'きゅうわ' },
      { romaji: 'juppa', hiragana: 'じゅっぱ' },
    ],
  },
  {
    id: 'soku',
    kanji: '足',
    label: '足 (soku)',
    meaning: 'pairs of footwear (shoes, socks...)',
    icon: '👟',
    rank: 17,
    sentence: 'I bought {n} pairs of socks.',
    note: 'Gemination before s: 1, 8, 10 — same pattern as 冊/歳/回.',
    readings: [
      { romaji: 'issoku', hiragana: 'いっそく' },
      { romaji: 'nisoku', hiragana: 'にそく' },
      { romaji: 'sansoku', hiragana: 'さんそく' },
      { romaji: 'yonsoku', hiragana: 'よんそく' },
      { romaji: 'gosoku', hiragana: 'ごそく' },
      { romaji: 'rokusoku', hiragana: 'ろくそく' },
      { romaji: 'nanasoku', hiragana: 'ななそく' },
      { romaji: 'hassoku', hiragana: 'はっそく' },
      { romaji: 'kyuusoku', hiragana: 'きゅうそく' },
      { romaji: 'jussoku', hiragana: 'じゅっそく' },
    ],
  },
];

/* ------------------------------------------------------------------
   Telling time (何時何分 / nanji nanpun)
   Hours have their own irregular readings — 4, 7 and 9 o'clock do NOT
   follow the normal digit series (yon/nana/kyuu); they use the old
   readings yo/shichi/ku instead. Minutes reuse the 分 (fun/pun)
   pattern from COUNTERS, with the well-known っ gemination at the
   "juu"+fun boundary for every multiple of ten.
------------------------------------------------------------------- */

const CLOCK_EMOJI = ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'];
const HOUR_R = ['', 'ichiji', 'niji', 'sanji', 'yoji', 'goji', 'rokuji', 'shichiji', 'hachiji', 'kuji', 'juuji', 'juuichiji', 'juuniji'];
const HOUR_H = ['', 'いちじ', 'にじ', 'さんじ', 'よじ', 'ごじ', 'ろくじ', 'しちじ', 'はちじ', 'くじ', 'じゅうじ', 'じゅういちじ', 'じゅうにじ'];
const IRREGULAR_HOURS = new Set([4, 7, 9]);

// Minutes practiced are 5-minute increments (0, 5, 10, ... 55) — plenty
// for a beginner and it keeps every reading following a clean pattern.
const PRACTICE_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function minuteReading(m) {
  if (m === 0) return { romaji: '', hiragana: '' };
  if (m === 5) return { romaji: 'gofun', hiragana: 'ごふん' };

  const tens = Math.floor(m / 10);
  const ones = m % 10;

  if (ones === 5) {
    // 15, 25, 35, 45, 55 -> (X)juugofun
    const prefixR = tens === 1 ? 'juu' : DIGIT_R[tens] + 'juu';
    const prefixH = tens === 1 ? 'じゅう' : DIGIT_H[tens] + 'じゅう';
    return { romaji: prefixR + 'gofun', hiragana: prefixH + 'ごふん' };
  }
  // 10, 20, 30, 40, 50 -> (X)juppun (the juu+fun boundary always geminates)
  const prefixR = tens === 1 ? '' : DIGIT_R[tens];
  const prefixH = tens === 1 ? '' : DIGIT_H[tens];
  const reading = { romaji: prefixR + 'juppun', hiragana: prefixH + 'じゅっぷん' };
  if (m === 30) {
    reading.altRomaji = 'han';
    reading.altHiragana = 'はん';
  }
  return reading;
}

function timeToReading(hour, minute) {
  const min = minuteReading(minute);
  const romaji = joinR(HOUR_R[hour], min.romaji);
  const hiragana = HOUR_H[hour] + min.hiragana;
  const result = { romaji, hiragana, display: `${hour}:${String(minute).padStart(2, '0')}` };
  if (min.altRomaji) {
    result.altRomaji = joinR(HOUR_R[hour], min.altRomaji);
    result.altHiragana = HOUR_H[hour] + min.altHiragana;
  }
  return result;
}

/* ------------------------------------------------------------------
   Beginner-friendly sentence frames used in "sentence mode" — wraps a
   bare number/counter/time prompt in a little context so it feels
   like real usage instead of a flashcard fragment.
------------------------------------------------------------------- */

const NUMBER_SENTENCES = [
  'There are {n} students in the classroom.',
  'I read {n} pages last night.',
  'The store is {n} meters from here.',
  'She has {n} unread messages.',
  'The recipe needs {n} eggs.',
];

const TIME_SENTENCES = [
  'The train departs at {t}.',
  'I usually wake up at {t}.',
  'The meeting starts at {t}.',
  'The store closes at {t}.',
  'Class ends at {t}.',
];
