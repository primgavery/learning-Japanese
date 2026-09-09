/* ------------------------------------------------------------------
   Quiz engine — generates questions and grades answers for both
   the Numbers mode and the Counters mode.
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

const Game = {
  mode: 'numbers', // 'numbers' | 'counters' | 'mixed'
  numberMax: 100,
  enabledCounters: COUNTERS.map((c) => c.id),
  includeAgeIrregular: true,
  multipleChoice: false,

  score: 0,
  streak: 0,
  bestStreak: 0,
  answered: 0,
  missed: [], // { promptText, romaji, hiragana }

  current: null,

  loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('jp-counters-settings') || '{}');
      if (saved.mode) this.mode = saved.mode;
      if (saved.numberMax) this.numberMax = saved.numberMax;
      if (saved.enabledCounters) this.enabledCounters = saved.enabledCounters;
      if (typeof saved.multipleChoice === 'boolean') this.multipleChoice = saved.multipleChoice;
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

  buildNumberQuestion() {
    const n = this.randInt(1, this.numberMax);
    const reading = numberToReading(n);
    return {
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
  },

  buildCounterQuestion() {
    const counters = this.activeCounters();
    const counter = counters[this.randInt(0, counters.length - 1)];

    const useIrregular20 =
      counter.irregular20 && this.includeAgeIrregular && Math.random() < 0.15;

    let count, reading;
    if (useIrregular20) {
      count = 20;
      reading = counter.irregular20;
    } else {
      count = this.randInt(1, 10);
      reading = counter.readings[count - 1];
    }

    return {
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
  },

  buildChoices(question) {
    // Build 3 plausible wrong answers + the correct one, shuffled.
    const wrongPool = new Set();

    if (question.kind === 'counter') {
      const c = question.counter;
      c.readings.forEach((r) => {
        if (r.romaji !== question.romaji) wrongPool.add(r.romaji);
      });
      if (c.irregular20 && c.irregular20.romaji !== question.romaji) {
        wrongPool.add(c.irregular20.romaji);
      }
      // also mix in readings from a different counter for variety
      const others = COUNTERS.filter((x) => x.id !== c.id);
      const other = others[this.randInt(0, others.length - 1)];
      const otherReading = other.readings[question.count <= 10 ? question.count - 1 : 0];
      if (otherReading) wrongPool.add(otherReading.romaji);
    } else {
      // numbers: perturb the target number a bit for near-miss distractors
      const n = parseInt(question.promptKanji.replace(/,/g, ''), 10);
      [1, -1, 10, -10].forEach((delta) => {
        const alt = n + delta;
        if (alt > 0 && alt !== n) wrongPool.add(numberToReading(alt).romaji);
      });
    }

    const wrongArr = Array.from(wrongPool);
    // shuffle
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
    if (kind === 'mixed') kind = Math.random() < 0.5 ? 'numbers' : 'counters';

    this.current =
      kind === 'numbers' ? this.buildNumberQuestion() : this.buildCounterQuestion();

    if (this.multipleChoice) {
      this.current.choices = this.buildChoices(this.current);
    }
    return this.current;
  },

  submit(rawAnswer) {
    const q = this.current;
    if (!q) return null;

    let correct;
    if (isHiraganaInput(rawAnswer)) {
      correct = q.acceptedHiragana.includes(rawAnswer.trim());
    } else {
      correct = q.accepted.includes(normalize(rawAnswer));
    }

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
