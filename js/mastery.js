/* ------------------------------------------------------------------
   Mastery tracking (lightweight Leitner-box spaced repetition).

   Every trackable item (a specific counter+count, a specific hour, a
   specific kana) has a "box" 0-4. A correct answer advances the box
   (max 4); a wrong answer resets it to 0. Selection weight is highest
   for box 0 (new or struggling) and lowest for box 4 (well-known),
   never zero — so mastered items still resurface occasionally for
   retention, but weak/unseen items come up far more often.

   Shared across the quiz, the fishing game, and kana practice so
   progress made anywhere feeds the same "what needs work" signal.
------------------------------------------------------------------- */

const MASTERY_BOX_WEIGHTS = [8, 5, 3, 2, 1];

const Mastery = {
  items: {},

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('jp-mastery') || '{}');
      if (saved.items) this.items = saved.items;
    } catch (e) {
      /* ignore corrupt storage */
    }
  },

  save() {
    localStorage.setItem('jp-mastery', JSON.stringify({ items: this.items }));
  },

  get(key) {
    return this.items[key] || { box: 0, seen: 0, correct: 0 };
  },

  record(key, correct) {
    if (!key) return;
    const item = this.items[key] || { box: 0, seen: 0, correct: 0 };
    item.seen += 1;
    if (correct) {
      item.correct += 1;
      item.box = Math.min(4, item.box + 1);
    } else {
      item.box = 0;
    }
    this.items[key] = item;
    this.save();
  },

  weight(key) {
    return MASTERY_BOX_WEIGHTS[this.get(key).box];
  },

  // entries: [{ value, key }] — returns one `value`, weighted so
  // low-box (weak/new) entries come up far more often than mastered ones.
  weightedPick(entries) {
    const weighted = entries.map((e) => ({ value: e.value, weight: this.weight(e.key) }));
    const total = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * total;
    for (const w of weighted) {
      roll -= w.weight;
      if (roll <= 0) return w.value;
    }
    return weighted[weighted.length - 1].value;
  },

  reset() {
    this.items = {};
    this.save();
  },
};

Mastery.load();
