/* ------------------------------------------------------------------
   Kana chart — built directly from the mora tables already in
   romaji.js, so there's one source of truth for every reading. Katakana
   is derived from hiragana by a fixed Unicode offset (+0x60) rather
   than hand-typed, since the two blocks are laid out in parallel.
------------------------------------------------------------------- */

function hiraganaToKatakana(str) {
  return str
    .split('')
    .map((ch) => {
      const code = ch.codePointAt(0);
      return code >= 0x3041 && code <= 0x3096 ? String.fromCodePoint(code + 0x60) : ch;
    })
    .join('');
}

// Kunrei-style spelling aliases (si/ti/tu/hu/zi/jya-jyu-jyo) exist in the
// mora tables purely so the converter recognizes them as input — they'd
// just be confusing duplicates in a chart meant to teach the standard
// (Hepburn) reading, so they're excluded here.
const KANA_ALIASES_TO_SKIP = new Set(['si', 'ti', 'tu', 'hu', 'zi', 'jya', 'jyu', 'jyo']);

function buildKanaChart() {
  const chart = [];
  const seen = new Set();
  function add(romaji, hiragana) {
    if (KANA_ALIASES_TO_SKIP.has(romaji) || seen.has(hiragana)) return;
    seen.add(hiragana);
    chart.push({ romaji, hiragana, katakana: hiraganaToKatakana(hiragana) });
  }
  Object.keys(VOWELS).forEach((k) => add(k, VOWELS[k]));
  Object.keys(MORA2).forEach((k) => add(k, MORA2[k]));
  Object.keys(MORA3).forEach((k) => add(k, MORA3[k]));
  add('n', 'ん');
  Object.keys(DIGRAPHS).forEach((k) => add(k, DIGRAPHS[k]));
  return chart;
}

const KANA_CHART = buildKanaChart();
