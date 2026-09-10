/* ------------------------------------------------------------------
   Quiz engine — generates questions and grades answers for the
   Numbers, Counters, Time, and Mixed modes.
------------------------------------------------------------------- */

function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\-'’]/g, '');
}

function isHiraganaInput(str) {
  return /[぀-ゟ]/.test(str);
}

function fillTemplate(template, value) {
  return template.replace('{n}', value).replace('{t}', value);
}

// Canonical mastery key for a question — null for plain numbers, since
// tracking every possible number individually isn't meaningful (the skill
// there is computing the reading, not memorizing a specific item).
function itemKey(q) {
  if (q.kind === 'counter') return `counter:${q.counter.id}:${q.count}`;
  if (q.kind === 'time') return `time:${q.hour}`;
  if (q.kind === 'kana') return `kana:${q.hiragana}`;
  if (q.kind === 'date-month') return `date:month:${q.month}`;
  if (q.kind === 'date-day') return `date:day:${q.day}`;
  if (q.kind === 'date-weekday') return `date:weekday:${q.weekdayIndex}`;
  if (q.kind === 'phrase') return `phrase:${q.phraseIndex}`;
  return null;
}

const Game = {
  mode: 'numbers', // 'numbers' | 'counters' | 'time' | 'kana' | 'date' | 'phrases' | 'mixed'
  numberMax: 100,
  enabledCounters: COUNTERS.map((c) => c.id),
  includeAgeIrregular: true,
  multipleChoice: false,
  kanaSystem: 'hiragana', // 'hiragana' | 'katakana' | 'both'
  sentenceMode: true,
  prioritizeCommon: true,

  score: 0,
  streak: 0,
  bestStreak: 0,
  answered: 0,
  missed: [], // { promptKanji, promptLabel, romaji, hiragana }

  current: null,

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('jp-counters-settings') || '{}');
      if (saved.mode) this.mode = saved.mode;
      if (saved.numberMax) this.numberMax = saved.numberMax;
      if (saved.enabledCounters) this.enabledCounters = saved.enabledCounters;
      if (typeof saved.multipleChoice === 'boolean') this.multipleChoice = saved.multipleChoice;
      if (typeof saved.sentenceMode === 'boolean') this.sentenceMode = saved.sentenceMode;
      if (typeof saved.prioritizeCommon === 'boolean') this.prioritizeCommon = saved.prioritizeCommon;
      if (saved.kanaSystem) this.kanaSystem = saved.kanaSystem;
      if (typeof saved.bestStreak === 'number') this.bestStreak = saved.bestStreak;
    } catch (e) {
      /* ignore corrupt storage */
    }
  },

  saveSettings() {
    localStorage.setItem(
      'jp-counters-settings',
      JSON.stringify({
        mode: this.mode,
        numberMax: this.numberMax,
        enabledCounters: this.enabledCounters,
        multipleChoice: this.multipleChoice,
        sentenceMode: this.sentenceMode,
        prioritizeCommon: this.prioritizeCommon,
        kanaSystem: this.kanaSystem,
        bestStreak: this.bestStreak,
      })
    );
  },

  activeCounters() {
    const set = COUNTERS.filter((c) => this.enabledCounters.includes(c.id));
    return set.length ? set : COUNTERS;
  },

  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Higher-ranked (more common) counters get picked more often, since
  // that's the whole point of ranking them — practice time should be
  // weighted toward what's actually useful day to day.
  counterWeight(rank) {
    if (rank <= 2) return 6;
    if (rank <= 6) return 3;
    if (rank <= 10) return 2;
    return 1;
  },

  pickCounter() {
    const counters = this.activeCounters();
    if (!this.prioritizeCommon) return counters[this.randInt(0, counters.length - 1)];

    const weights = counters.map((c) => this.counterWeight(c.rank));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < counters.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return counters[i];
    }
    return counters[counters.length - 1];
  },

  // Within a chosen counter, which count (1-10, or the irregular 20) comes
  // up is weighted toward whatever you personally get wrong most — the
  // same Leitner-box mastery tracking used by fishing and kana practice.
  pickCount(counter) {
    const useIrregular20 =
      counter.irregular20 && this.includeAgeIrregular && Math.random() < 0.15;
    if (useIrregular20) return 20;

    const entries = [];
    for (let c = 1; c <= 10; c++) entries.push({ value: c, key: `counter:${counter.id}:${c}` });
    return Mastery.weightedPick(entries);
  },

  // Same idea for hours — this is where the real difficulty lives (the
  // irregular 4/7/9時 readings), so weak hours come up more often.
  pickHour() {
    const entries = [];
    for (let h = 1; h <= 12; h++) entries.push({ value: h, key: `time:${h}` });
    return Mastery.weightedPick(entries);
  },

  pickMonth() {
    const entries = [];
    for (let m = 1; m <= 12; m++) entries.push({ value: m, key: `date:month:${m}` });
    return Mastery.weightedPick(entries);
  },

  // The real difficulty in dates: 1-10, 14, 20, 24 are irregular native
  // words unrelated to the digit series, so weak days surface more often.
  pickDay() {
    const entries = [];
    for (let d = 1; d <= 31; d++) entries.push({ value: d, key: `date:day:${d}` });
    return Mastery.weightedPick(entries);
  },

  pickWeekday() {
    const entries = [];
    for (let i = 0; i < 7; i++) entries.push({ value: i, key: `date:weekday:${i}` });
    return Mastery.weightedPick(entries);
  },

  buildNumberQuestion() {
    const n = this.randInt(1, this.numberMax);
    const reading = numberToReading(n);
    const q = {
      kind: 'number',
      promptKanji: n.toLocaleString('en-US'),
      promptLabel: 'How do you say this number?',
      icon: '🔢',
      accepted: [normalize(reading.romaji)],
      acceptedHiragana: [reading.hiragana],
      romaji: reading.romaji,
      hiragana: reading.hiragana,
      explanation: null,
    };
    if (this.sentenceMode) {
      const template = NUMBER_SENTENCES[this.randInt(0, NUMBER_SENTENCES.length - 1)];
      q.sentence = fillTemplate(template, n);
    }
    return q;
  },

  buildCounterQuestion() {
    return this.buildCounterQuestionFor(this.pickCounter());
  },

  // Builds a counter question pinned to a specific counter — shared by the
  // quiz (which picks the counter itself) and the fishing game (which picks
  // a counter per fish species).
  buildCounterQuestionFor(counter) {
    const count = this.pickCount(counter);
    const reading = count === 20 ? counter.irregular20 : counter.readings[count - 1];

    const q = {
      kind: 'counter',
      counter,
      count,
      promptKanji: `${count} ${counter.kanji}`,
      promptLabel: `${count} × ${counter.meaning}`,
      icon: counter.icon,
      accepted: [normalize(reading.romaji)],
      acceptedHiragana: [reading.hiragana],
      romaji: reading.romaji,
      hiragana: reading.hiragana,
      explanation: counter.note,
    };
    if (this.sentenceMode && counter.sentence) {
      q.sentence = fillTemplate(counter.sentence, count);
    }
    return q;
  },

  buildTimeQuestion() {
    const hour = this.pickHour();
    const minute = PRACTICE_MINUTES[this.randInt(0, PRACTICE_MINUTES.length - 1)];
    const reading = timeToReading(hour, minute);

    const accepted = [normalize(reading.romaji)];
    const acceptedHiragana = [reading.hiragana];
    if (reading.altRomaji) {
      accepted.push(normalize(reading.altRomaji));
      acceptedHiragana.push(reading.altHiragana);
    }

    let explanation = null;
    if (IRREGULAR_HOURS.has(hour)) {
      explanation = `${hour}時 is irregular — it's "${HOUR_R[hour]}", not the reading you'd get from the normal digit (${DIGIT_R[hour]}+ji).`;
    } else if (minute === 30) {
      explanation = 'For the half hour, はん (han, "half") is more natural than saying さんじゅっぷん.';
    }

    const q = {
      kind: 'time',
      hour,
      minute,
      promptKanji: reading.display,
      promptLabel: 'What time is this?',
      icon: CLOCK_EMOJI[hour % 12],
      accepted,
      acceptedHiragana,
      romaji: reading.romaji,
      hiragana: reading.hiragana,
      romajiDisplay: reading.altRomaji ? `${reading.romaji} (or ${reading.altRomaji})` : reading.romaji,
      hiraganaDisplay: reading.altHiragana ? `${reading.hiragana} / ${reading.altHiragana}` : reading.hiragana,
      explanation,
    };
    if (this.sentenceMode) {
      const template = TIME_SENTENCES[this.randInt(0, TIME_SENTENCES.length - 1)];
      q.sentence = fillTemplate(template, reading.display);
    }
    return q;
  },

  buildKanaQuestion() {
    const entries = KANA_CHART.map((e) => ({ value: e, key: `kana:${e.hiragana}` }));
    const entry = Mastery.weightedPick(entries);
    const system = this.kanaSystem === 'both' ? (Math.random() < 0.5 ? 'hiragana' : 'katakana') : this.kanaSystem;
    const promptChar = system === 'katakana' ? entry.katakana : entry.hiragana;

    return {
      kind: 'kana',
      promptKanji: promptChar,
      promptLabel: `${system === 'katakana' ? 'Katakana' : 'Hiragana'} — what sound is this?`,
      icon: '🈴',
      accepted: [normalize(entry.romaji)],
      acceptedHiragana: [entry.hiragana],
      romaji: entry.romaji,
      hiragana: entry.hiragana,
      explanation: null,
    };
  },

  // Dates mix four question types: the month alone, the day alone (where
  // the real irregularity lives), a weekday, and an occasional full date
  // combining month+day for realistic practice. The atomic ones (month/
  // day/weekday) feed mastery; the combined one is just variety.
  buildDateQuestion() {
    const roll = Math.random();

    if (roll < 0.15) {
      const idx = this.pickWeekday();
      const w = WEEKDAYS[idx];
      return {
        kind: 'date-weekday',
        weekdayIndex: idx,
        promptKanji: w.kanji,
        promptLabel: 'What day of the week is this?',
        icon: '📅',
        accepted: [normalize(w.romaji)],
        acceptedHiragana: [w.hiragana],
        romaji: w.romaji,
        hiragana: w.hiragana,
        explanation: null,
      };
    }

    if (roll < 0.5) {
      const m = this.pickMonth();
      return {
        kind: 'date-month',
        month: m,
        promptKanji: `${m}月`,
        promptLabel: 'What month is this?',
        icon: '📅',
        accepted: [normalize(MONTH_R[m])],
        acceptedHiragana: [MONTH_H[m]],
        romaji: MONTH_R[m],
        hiragana: MONTH_H[m],
        explanation: IRREGULAR_MONTHS.has(m)
          ? `${m}月 is irregular — it's "${MONTH_R[m]}", not what the normal digit series would give you.`
          : null,
      };
    }

    if (roll < 0.85) {
      const d = this.pickDay();
      return {
        kind: 'date-day',
        day: d,
        promptKanji: `${d}日`,
        promptLabel: 'What day of the month is this?',
        icon: '📅',
        accepted: [normalize(DAY_R[d])],
        acceptedHiragana: [DAY_H[d]],
        romaji: DAY_R[d],
        hiragana: DAY_H[d],
        explanation: IRREGULAR_DAYS.has(d)
          ? `${d}日 is one of the irregular native-Japanese day names — it doesn't follow a number+nichi pattern at all.`
          : `Regular pattern here: the number + nichi.`,
      };
    }

    const m = this.pickMonth();
    const d = this.pickDay();
    const romaji = MONTH_R[m] + DAY_R[d];
    const hiragana = MONTH_H[m] + DAY_H[d];
    return {
      kind: 'date-full',
      month: m,
      day: d,
      promptKanji: `${m}月${d}日`,
      promptLabel: 'Read this date',
      icon: '📅',
      accepted: [normalize(romaji)],
      acceptedHiragana: [hiragana],
      romaji,
      hiragana,
      explanation: null,
    };
  },

  // Direction reversed on purpose — English situation in, Japanese out,
  // since production (not just recognition) is the useful skill for a
  // phrase you'd actually reach for.
  buildPhraseQuestion() {
    const entries = PHRASES.map((p, i) => ({ value: i, key: `phrase:${i}` }));
    const idx = Mastery.weightedPick(entries);
    const p = PHRASES[idx];
    return {
      kind: 'phrase',
      phraseIndex: idx,
      promptKanji: p.en,
      promptLabel: 'How do you say this in Japanese?',
      icon: '💬',
      accepted: [normalize(p.romaji)],
      acceptedHiragana: [p.hiragana],
      romaji: p.romaji,
      hiragana: p.hiragana,
      explanation: null,
    };
  },

  buildChoices(question) {
    // Build 3 plausible wrong answers + the correct one, shuffled.
    const wrongPool = new Set();
    const correctRomaji = question.accepted[0];

    if (question.kind === 'counter') {
      const c = question.counter;
      c.readings.forEach((r) => {
        const norm = normalize(r.romaji);
        if (norm !== correctRomaji) wrongPool.add(r.romaji);
      });
      if (c.irregular20 && normalize(c.irregular20.romaji) !== correctRomaji) {
        wrongPool.add(c.irregular20.romaji);
      }
      // also mix in a reading from a different counter for variety
      const others = COUNTERS.filter((x) => x.id !== c.id);
      const other = others[this.randInt(0, others.length - 1)];
      const otherReading = other.readings[question.count <= 10 ? question.count - 1 : 0];
      if (otherReading) wrongPool.add(otherReading.romaji);
    } else if (question.kind === 'time') {
      const { hour, minute } = question;
      // the classic beginner mistake: regular digit + ji instead of the irregular hour word
      if (IRREGULAR_HOURS.has(hour)) wrongPool.add(DIGIT_R[hour] + 'ji');
      // random other times until we have enough distinct distractors
      let guard = 0;
      while (wrongPool.size < 3 && guard < 20) {
        guard++;
        const randHour = this.randInt(1, 12);
        const randMinute = PRACTICE_MINUTES[this.randInt(0, PRACTICE_MINUTES.length - 1)];
        if (randHour === hour && randMinute === minute) continue;
        wrongPool.add(timeToReading(randHour, randMinute).romaji);
      }
    } else if (question.kind === 'kana') {
      // other kana, preferring ones that look or sound similar so the
      // choice actually tests recognition rather than being a free pick
      let guard = 0;
      while (wrongPool.size < 3 && guard < 30) {
        guard++;
        const alt = KANA_CHART[this.randInt(0, KANA_CHART.length - 1)];
        if (normalize(alt.romaji) !== correctRomaji) wrongPool.add(alt.romaji);
      }
    } else if (question.kind === 'date-month') {
      for (let m = 1; m <= 12; m++) {
        if (m !== question.month) wrongPool.add(MONTH_R[m]);
      }
    } else if (question.kind === 'date-day') {
      let guard = 0;
      while (wrongPool.size < 3 && guard < 40) {
        guard++;
        const d = this.randInt(1, 31);
        if (d !== question.day) wrongPool.add(DAY_R[d]);
      }
    } else if (question.kind === 'date-weekday') {
      WEEKDAYS.forEach((w, i) => {
        if (i !== question.weekdayIndex) wrongPool.add(w.romaji);
      });
    } else if (question.kind === 'date-full') {
      let guard = 0;
      while (wrongPool.size < 3 && guard < 40) {
        guard++;
        const m = this.randInt(1, 12);
        const d = this.randInt(1, 31);
        if (m === question.month && d === question.day) continue;
        wrongPool.add(MONTH_R[m] + DAY_R[d]);
      }
    } else if (question.kind === 'phrase') {
      let guard = 0;
      while (wrongPool.size < 3 && guard < 40) {
        guard++;
        const p = PHRASES[this.randInt(0, PHRASES.length - 1)];
        if (normalize(p.romaji) !== correctRomaji) wrongPool.add(p.romaji);
      }
    } else {
      // numbers: perturb the target number a bit for near-miss distractors
      const n = parseInt(question.promptKanji.replace(/,/g, ''), 10);
      [1, -1, 10, -10].forEach((delta) => {
        const alt = n + delta;
        if (alt > 0 && alt !== n) wrongPool.add(numberToReading(alt).romaji);
      });
    }

    const wrongArr = Array.from(wrongPool).filter((w) => normalize(w) !== correctRomaji);
    for (let i = wrongArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongArr[i], wrongArr[j]] = [wrongArr[j], wrongArr[i]];
    }
    const choices = [question.romaji, ...wrongArr.slice(0, 3)];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  },

  next() {
    let kind = this.mode;
    if (kind === 'mixed') {
      kind = ['numbers', 'counters', 'time'][this.randInt(0, 2)];
    }

    if (kind === 'numbers') this.current = this.buildNumberQuestion();
    else if (kind === 'time') this.current = this.buildTimeQuestion();
    else if (kind === 'kana') this.current = this.buildKanaQuestion();
    else if (kind === 'date') this.current = this.buildDateQuestion();
    else if (kind === 'phrases') this.current = this.buildPhraseQuestion();
    else this.current = this.buildCounterQuestion();

    if (this.multipleChoice) {
      this.current.choices = this.buildChoices(this.current);
    }
    return this.current;
  },

  checkAnswer(raw, q) {
    const trimmed = raw.trim();
    if (isHiraganaInput(trimmed)) {
      return q.acceptedHiragana.includes(trimmed);
    }
    if (q.accepted.includes(normalize(trimmed))) return true;
    // forgiving fallback: convert whatever romaji they typed (including
    // Kunrei-style spelling like "tu"/"si"/"hu") and compare in kana
    const converted = romajiToHiragana(trimmed);
    return q.acceptedHiragana.includes(converted);
  },

  submit(rawAnswer) {
    const q = this.current;
    if (!q) return null;

    const correct = this.checkAnswer(rawAnswer, q);
    Mastery.record(itemKey(q), correct);

    this.answered++;
    if (correct) {
      this.score++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
    } else {
      this.streak = 0;
      this.missed.push({
        promptKanji: q.promptKanji,
        promptLabel: q.promptLabel,
        romaji: q.romaji,
        hiragana: q.hiragana,
      });
      if (this.missed.length > 50) this.missed.shift();
    }
    this.saveSettings();
    return correct;
  },

  resetScore() {
    this.score = 0;
    this.streak = 0;
    this.answered = 0;
    this.missed = [];
  },
};
