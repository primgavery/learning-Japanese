/* ------------------------------------------------------------------
   Minimal romaji -> hiragana converter (no dependencies).
   Covers everything used by this app's data: plain mora, the y-row
   digraphs (kya/sha/cha/...), sokuon (small っ from doubled
   consonants), and both Hepburn and common Kunrei spelling variants
   (si/ti/tu/hu/zi as aliases of shi/chi/tsu/fu/ji).
------------------------------------------------------------------- */

const DIGRAPHS = {
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ',
};

const MORA3 = {
  shi: 'し', chi: 'ち', tsu: 'つ',
};

const MORA2 = {
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  sa: 'さ', su: 'す', se: 'せ', so: 'そ', si: 'し',
  ta: 'た', te: 'て', to: 'と', ti: 'ち', tu: 'つ',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', fu: 'ふ', he: 'へ', ho: 'ほ', hu: 'ふ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  wa: 'わ', wo: 'を',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  za: 'ざ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ', zi: 'じ',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
};

const VOWELS = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };

const SOKUON_CONSONANTS = new Set(['k', 's', 't', 'p', 'g', 'z', 'd', 'b', 'c']);

function romajiToHiragana(input) {
  const s = input.toLowerCase().replace(/[^a-z']/g, '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === "'") {
      // explicit morpheme-boundary marker (e.g. "sen'ichi") — consume, emit nothing
      i += 1;
      continue;
    }
    const c3 = s.slice(i, i + 3);
    const c2 = s.slice(i, i + 2);
    const c1 = s[i];

    if (
      s[i + 1] &&
      s[i] === s[i + 1] &&
      SOKUON_CONSONANTS.has(c1) &&
      c1 !== s[i + 2] // avoid eating three-in-a-row as two sokuon
    ) {
      out += 'っ';
      i += 1;
      continue;
    }
    if (DIGRAPHS[c3]) {
      out += DIGRAPHS[c3];
      i += 3;
      continue;
    }
    if (MORA3[c3]) {
      out += MORA3[c3];
      i += 3;
      continue;
    }
    if (MORA2[c2]) {
      out += MORA2[c2];
      i += 2;
      continue;
    }
    if (c1 === 'n') {
      out += 'ん';
      i += 1;
      continue;
    }
    if (VOWELS[c1]) {
      out += VOWELS[c1];
      i += 1;
      continue;
    }
    // unrecognized character (stray consonant awaiting its vowel) — pass through
    out += c1;
    i += 1;
  }
  return out;
}
