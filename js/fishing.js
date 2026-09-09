/* ------------------------------------------------------------------
   Fishing mini-game — a lightweight arcade layer on top of the same
   number/counter/time question data used by the quiz. Rarer counters
   (higher `rank`) become rarer, higher-value fish; catching one for
   the first time reveals it in the catch log. Coins buy upgrades that
   make fishing easier (more time, more concurrent fish, better odds
   at rare fish).
------------------------------------------------------------------- */

// Swim times are deliberately generous — this is meant to be a low-stress
// way to practice, not a reflex test. Rarer fish are still a bit quicker,
// but nothing here should feel like it's racing a beginner's typing speed.
const FISH_TIERS = {
  common: { weight: 10, swim: 18, coins: 4, label: 'Common' },
  uncommon: { weight: 6, swim: 15, coins: 8, label: 'Uncommon' },
  rare: { weight: 3, swim: 13, coins: 15, label: 'Rare' },
  epic: { weight: 1, swim: 11, coins: 25, label: 'Epic' },
};

const NUMBERFISH_TIER = { weight: 14, swim: 16, coins: 1, label: 'Baitfish' };

function counterTier(rank) {
  if (rank <= 2) return 'common';
  if (rank <= 6) return 'uncommon';
  if (rank <= 10) return 'rare';
  return 'epic';
}

const FISH_SPECIES = [
  ...COUNTERS.map((c) => ({
    id: c.id,
    kind: 'counter',
    counter: c,
    tier: counterTier(c.rank),
    icon: c.icon,
    name: c.label,
    meaning: c.meaning,
  })),
  {
    id: 'clock',
    kind: 'clock',
    tier: 'rare',
    icon: '🕒',
    name: 'Clockfish',
    meaning: 'A rare catch tagged with a time to read.',
  },
];

const UPGRADE_DEFS = {
  bait: { label: 'Better Bait', icon: '🪱', desc: '+3s swim time for every fish', max: 3, baseCost: 20 },
  net: { label: 'Bigger Net', icon: '🥅', desc: '+1 fish on the line at once', max: 3, baseCost: 40 },
  charm: { label: 'Lucky Charm', icon: '🍀', desc: 'Rare & epic fish bite more often', max: 3, baseCost: 30 },
};

function upgradeCost(key, level) {
  return Math.round(UPGRADE_DEFS[key].baseCost * Math.pow(1.6, level));
}

const FishingState = {
  coins: 0,
  upgrades: { bait: 0, net: 0, charm: 0 },
  collection: {},
  totalCaught: 0,
  bestCombo: 0,
  combo: 0,
  fishes: [],
  selectedId: null,
  nextFishId: 1,
  // On by default: recognizing the right reading among choices is a much
  // more realistic ask for someone who hasn't learned it yet than free
  // recall. Typing it out is there for once you're ready for the challenge.
  multipleChoice: true,

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('jp-fishing-save') || '{}');
      if (typeof saved.coins === 'number') this.coins = saved.coins;
      if (saved.upgrades) this.upgrades = { ...this.upgrades, ...saved.upgrades };
      if (saved.collection) this.collection = saved.collection;
      if (typeof saved.totalCaught === 'number') this.totalCaught = saved.totalCaught;
      if (typeof saved.bestCombo === 'number') this.bestCombo = saved.bestCombo;
      if (typeof saved.multipleChoice === 'boolean') this.multipleChoice = saved.multipleChoice;
    } catch (e) {
      /* ignore corrupt storage */
    }
  },

  save() {
    localStorage.setItem(
      'jp-fishing-save',
      JSON.stringify({
        coins: this.coins,
        upgrades: this.upgrades,
        collection: this.collection,
        totalCaught: this.totalCaught,
        bestCombo: this.bestCombo,
        multipleChoice: this.multipleChoice,
      })
    );
  },

  maxConcurrent() {
    // Starts at 2 so it feels like a game with things happening, not a
    // single lane — upgrades push it further for those who want busier.
    return 2 + this.upgrades.net;
  },

  swimBonus() {
    return this.upgrades.bait * 3;
  },
};

function buildSpawnPool() {
  const pool = [{ weight: NUMBERFISH_TIER.weight, spec: { kind: 'number', tier: 'filler' } }];
  FISH_SPECIES.forEach((spec) => {
    let weight = FISH_TIERS[spec.tier].weight;
    if (spec.tier === 'rare' || spec.tier === 'epic') {
      weight *= 1 + FishingState.upgrades.charm * 0.7;
    }
    pool.push({ weight, spec });
  });
  return pool;
}

function weightedPick(pool) {
  const total = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const p of pool) {
    roll -= p.weight;
    if (roll <= 0) return p.spec;
  }
  return pool[pool.length - 1].spec;
}

function buildFishQuestion(spec) {
  if (spec.kind === 'number') {
    const n = Math.floor(Math.random() * 100) + 1;
    const reading = numberToReading(n);
    return {
      kind: 'number',
      promptKanji: n.toLocaleString('en-US'),
      accepted: [normalize(reading.romaji)],
      acceptedHiragana: [reading.hiragana],
      romaji: reading.romaji,
      hiragana: reading.hiragana,
    };
  }
  // Reuse the exact same question builders (and shape) as the quiz — this
  // lets us reuse Game.buildChoices() below for fishing's multiple-choice
  // mode instead of reinventing distractor logic.
  if (spec.kind === 'clock') return Game.buildTimeQuestion();
  return Game.buildCounterQuestionFor(spec.counter);
}

// A real "why", not just "what" — reuses the same sound-change notes shown
// elsewhere in the app, but ties them to the specific number/count in front
// of you rather than just restating the general rule in isolation.
function buildLesson(q) {
  if (q.kind === 'counter') {
    const c = q.counter;
    if (q.count === 20) {
      return `20 is special: はたち (hatachi) is its own irregular word here, not built from a number + counter like the rest of this pattern.`;
    }
    return `${c.note} Here: ${q.count} + ${c.kanji} (${c.meaning}) → ${q.romaji}.`;
  }
  if (q.kind === 'time') {
    return q.explanation || 'This just combines the hour and minute readings directly — no irregularity to watch for here.';
  }
  const n = parseInt(q.promptKanji.replace(/,/g, ''), 10);
  return explainNumber(n) || "This one's just the digits read straight through — no special sound change here.";
}

let spawnTimer = null;

function attemptSpawn() {
  if (FishingState.fishes.length >= FishingState.maxConcurrent()) return;
  spawnFish();
}

function spawnFish() {
  const spec = weightedPick(buildSpawnPool());
  const tierInfo = spec.kind === 'number' ? NUMBERFISH_TIER : FISH_TIERS[spec.tier];
  const question = buildFishQuestion(spec);
  const swimSeconds = tierInfo.swim + FishingState.swimBonus();
  const fish = {
    id: FishingState.nextFishId++,
    spec,
    coinValue: tierInfo.coins,
    swimSeconds,
    question,
    choices: Game.buildChoices(question),
    direction: Math.random() < 0.5 ? 'ltr' : 'rtl',
    top: 10 + Math.random() * 65,
    caught: false,
  };
  FishingState.fishes.push(fish);
  renderFish(fish);
  if (!FishingState.selectedId) selectFish(fish.id);
}

function fishEl(id) {
  return document.querySelector(`.fish[data-id="${id}"]`);
}

// Reveals the correct reading right on the fish itself (not just in a
// message that could scroll away) so a wrong guess is a learning moment,
// not a dead end — the answer stays visible until the fish is caught.
function revealAnswer(fish) {
  if (fish.revealed) return;
  fish.revealed = true;
  const el = fishEl(fish.id);
  if (!el) return;
  const hint = el.querySelector('.fish-hint');
  hint.textContent = fish.question.romaji;
  hint.hidden = false;
}

function renderFish(fish) {
  const pond = document.getElementById('pond');
  const div = document.createElement('div');
  div.className = `fish dir-${fish.direction}`;
  div.dataset.id = fish.id;
  div.style.top = `${fish.top}%`;
  div.style.animationDuration = `${fish.swimSeconds}s`;

  const tierClass = fish.spec.kind === 'number' ? 'filler' : fish.spec.tier;
  const icon = fish.spec.kind === 'number' ? '🔢' : fish.spec.icon;

  div.innerHTML = `
    <div class="fish-hint" hidden></div>
    <div class="fish-tag">${fish.question.promptKanji}</div>
    <div class="fish-timebar"><div class="fish-timebar-fill"></div></div>
    <div class="fish-emoji-wrap tier-${tierClass}"><span class="fish-emoji">${icon}</span></div>
  `;
  div.querySelector('.fish-timebar-fill').style.animationDuration = `${fish.swimSeconds}s`;

  div.addEventListener('click', () => selectFish(fish.id));
  div.addEventListener('animationend', (e) => {
    if (e.target === div) handleEscape(fish.id);
  });

  pond.appendChild(div);
}

// Set while a lesson card is up, so the game doesn't let you wander off to
// another fish (or silently swap the answer area under it) mid-explanation.
let lessonFish = null;

function selectFish(id) {
  if (lessonFish) return; // finish the current lesson first
  FishingState.selectedId = id;
  document.querySelectorAll('.fish').forEach((el) => {
    el.classList.toggle('selected', Number(el.dataset.id) === id);
  });
  renderAnswerArea();
}

function selectAnyAvailable() {
  const next = FishingState.fishes[0];
  selectFish(next ? next.id : null);
}

function renderAnswerArea() {
  if (lessonFish) return; // the lesson card owns the answer area right now

  const castForm = document.getElementById('cast-form');
  const preview = document.getElementById('cast-hiragana-preview');
  const grid = document.getElementById('fish-choice-grid');
  const dontKnowBtn = document.getElementById('dont-know-btn');
  const fish = FishingState.fishes.find((f) => f.id === FishingState.selectedId);

  dontKnowBtn.hidden = !fish;

  if (!fish || !FishingState.multipleChoice) {
    castForm.hidden = false;
    preview.hidden = false;
    grid.hidden = true;
    grid.innerHTML = '';
    return;
  }

  castForm.hidden = true;
  preview.hidden = true;
  grid.hidden = false;
  grid.innerHTML = fish.choices
    .map((c) => `<button type="button" class="choice-btn" data-choice="${c}">${c}</button>`)
    .join('');
  grid.querySelectorAll('.choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleChoiceClick(fish, btn.dataset.choice, btn));
  });
}

// Freezes the fish's swim (so it can't also escape while the lesson is up),
// fills in the lesson card with the prompt/answer/why, and swaps the whole
// answer area over to it. Dismissed only by the player clicking through —
// no auto-timeout, so there's no way to miss the explanation.
function showLesson(fish) {
  lessonFish = fish;
  const el = fishEl(fish.id);
  if (el) el.classList.add('fish-frozen');
  revealAnswer(fish);

  document.getElementById('lesson-prompt').textContent = fish.question.promptKanji;
  document.getElementById('lesson-answer').textContent = `${fish.question.romaji} (${fish.question.hiragana})`;
  document.getElementById('lesson-why').textContent = buildLesson(fish.question);

  document.getElementById('cast-form').hidden = true;
  document.getElementById('cast-hiragana-preview').hidden = true;
  document.getElementById('fish-choice-grid').hidden = true;
  document.getElementById('dont-know-btn').hidden = true;
  document.getElementById('lesson-card').hidden = false;
}

function dismissLesson() {
  if (!lessonFish) return;
  const fish = lessonFish;
  lessonFish = null;
  document.getElementById('lesson-card').hidden = true;
  handleMiss(fish);
}

function handleChoiceClick(fish, choiceText, btnEl) {
  if (fish.caught || fish.locked) return;

  if (normalize(choiceText) === fish.question.accepted[0]) {
    handleCatch(fish);
    return;
  }

  // One guess — a wrong pick loses the fish, same as letting it escape.
  // Lock it immediately (so its swim animation can't also trigger an
  // escape mid-reveal), flash which one was right, then hand off to the
  // full lesson card — no clicking your way to a catch.
  fish.locked = true;
  btnEl.classList.add('incorrect');
  document.querySelectorAll('#fish-choice-grid .choice-btn').forEach((b) => {
    b.disabled = true;
    if (normalize(b.dataset.choice) === fish.question.accepted[0]) b.classList.add('correct');
  });
  setTimeout(() => showLesson(fish), 700);
}

function handleDontKnow() {
  const fish = FishingState.fishes.find((f) => f.id === FishingState.selectedId);
  if (!fish || fish.caught || fish.locked) return;
  fish.locked = true;

  if (FishingState.multipleChoice) {
    document.querySelectorAll('#fish-choice-grid .choice-btn').forEach((b) => {
      b.disabled = true;
      if (normalize(b.dataset.choice) === fish.question.accepted[0]) b.classList.add('correct');
    });
    setTimeout(() => showLesson(fish), 400);
  } else {
    showLesson(fish);
  }
}

// A wrong guess (typed, picked, or "I don't know") loses the fish outright
// — you don't get to try again, only the lesson you just saw.
function handleMiss(fish) {
  if (fish.caught) return;

  const idx = FishingState.fishes.findIndex((f) => f.id === fish.id);
  if (idx !== -1) FishingState.fishes.splice(idx, 1);
  const el = fishEl(fish.id);
  if (el) {
    el.classList.remove('fish-frozen');
    el.style.animation = 'none';
    el.classList.add('missed');
    setTimeout(() => el.remove(), 500);
  }

  FishingState.combo = 0;
  showMessage('Ready for the next one — you got this!', 'muted');

  if (FishingState.selectedId === fish.id) selectAnyAvailable();
  updateStatsUI();
}

function handleEscape(id) {
  const idx = FishingState.fishes.findIndex((f) => f.id === id);
  if (idx === -1) return;
  const fish = FishingState.fishes[idx];
  if (fish.caught || fish.locked) return;

  FishingState.fishes.splice(idx, 1);
  const el = fishEl(id);
  if (el) el.remove();

  FishingState.combo = 0;
  showMessage(`It got away... that one wanted "${fish.question.romaji}".`, 'muted');

  if (FishingState.selectedId === id) selectAnyAvailable();
  updateStatsUI();
}

function handleCatch(fish) {
  if (fish.caught || fish.locked) return;
  fish.caught = true;
  const multiplier = 1 + Math.min(FishingState.combo, 10) * 0.05;
  const coinsEarned = Math.round(fish.coinValue * multiplier);

  FishingState.coins += coinsEarned;
  FishingState.combo += 1;
  FishingState.bestCombo = Math.max(FishingState.bestCombo, FishingState.combo);
  FishingState.totalCaught += 1;
  if (fish.spec.kind !== 'number') {
    FishingState.collection[fish.spec.id] = (FishingState.collection[fish.spec.id] || 0) + 1;
  }
  FishingState.save();

  const el = fishEl(fish.id);
  if (el) {
    el.style.animation = 'none';
    el.classList.add('caught');
    spawnCoinFloat(el, coinsEarned);
    setTimeout(() => el.remove(), 500);
  }

  const idx = FishingState.fishes.findIndex((f) => f.id === fish.id);
  if (idx !== -1) FishingState.fishes.splice(idx, 1);

  showMessage(`🎉 Caught it! +${coinsEarned} coins${FishingState.combo > 1 ? ` (combo ×${FishingState.combo})` : ''}`, 'good');

  if (FishingState.selectedId === fish.id) selectAnyAvailable();
  updateStatsUI();
  renderShop();
  if (fish.spec.kind !== 'number') renderCollection();
}

function spawnCoinFloat(fishElement, amount) {
  const pond = document.getElementById('pond');
  const pondRect = pond.getBoundingClientRect();
  const rect = fishElement.getBoundingClientRect();
  const float = document.createElement('div');
  float.className = 'coin-float';
  float.textContent = `+${amount}🪙`;
  float.style.left = `${rect.left - pondRect.left + rect.width / 2}px`;
  float.style.top = `${rect.top - pondRect.top}px`;
  pond.appendChild(float);
  setTimeout(() => float.remove(), 900);
}

function showMessage(text, kind) {
  const box = document.getElementById('fishing-message');
  box.textContent = text;
  box.className = `fishing-message ${kind || ''}`;
}

function updateCastPreview() {
  const raw = document.getElementById('cast-input').value;
  const preview = document.getElementById('cast-hiragana-preview');
  if (!raw.trim()) {
    preview.innerHTML = '&nbsp;';
    return;
  }
  preview.textContent = isHiraganaInput(raw) ? raw : romajiToHiragana(raw);
}

function updateStatsUI() {
  document.getElementById('fish-coins').textContent = FishingState.coins;
  document.getElementById('fish-caught-total').textContent = FishingState.totalCaught;
  document.getElementById('fish-combo').textContent = FishingState.combo;
  document.getElementById('fish-best-combo').textContent = FishingState.bestCombo;
}

function renderShop() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = Object.keys(UPGRADE_DEFS)
    .map((key) => {
      const def = UPGRADE_DEFS[key];
      const level = FishingState.upgrades[key];
      const maxed = level >= def.max;
      const cost = maxed ? null : upgradeCost(key, level);
      return `
        <div class="shop-card">
          <div class="shop-icon">${def.icon}</div>
          <div class="shop-name">${def.label}</div>
          <div class="shop-desc">${def.desc}</div>
          <div class="shop-level">Level ${level} / ${def.max}</div>
          ${
            maxed
              ? '<div class="shop-maxed">MAXED</div>'
              : `<button type="button" class="shop-buy-btn" data-key="${key}" ${FishingState.coins < cost ? 'disabled' : ''}>Buy — 🪙${cost}</button>`
          }
        </div>
      `;
    })
    .join('');

  grid.querySelectorAll('.shop-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => buyUpgrade(btn.dataset.key));
  });
}

function buyUpgrade(key) {
  const def = UPGRADE_DEFS[key];
  const level = FishingState.upgrades[key];
  if (level >= def.max) return;
  const cost = upgradeCost(key, level);
  if (FishingState.coins < cost) return;

  FishingState.coins -= cost;
  FishingState.upgrades[key] += 1;
  FishingState.save();
  updateStatsUI();
  renderShop();
  showMessage(`Upgraded ${def.label} to level ${FishingState.upgrades[key]}!`, 'good');
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = FISH_SPECIES.map((spec) => {
    const count = FishingState.collection[spec.id] || 0;
    const tierLabel = FISH_TIERS[spec.tier].label;
    if (count === 0) {
      return `
        <div class="collection-card locked">
          <div class="collection-icon">❓</div>
          <div class="collection-tier">${tierLabel}</div>
        </div>
      `;
    }
    return `
      <div class="collection-card caught tier-${spec.tier}">
        <div class="collection-icon">${spec.icon}</div>
        <div class="collection-name">${spec.name}</div>
        <div class="collection-meaning">${spec.meaning}</div>
        <div class="collection-count">Caught ×${count}</div>
      </div>
    `;
  }).join('');
}

function pauseFishing() {
  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = null;
  document.getElementById('pond').classList.add('paused');
}

function resumeFishing() {
  if (!spawnTimer) {
    // Fill the pond right away instead of trickling in one fish per tick —
    // with multiple fish now the default, the game should feel busy the
    // moment you open the tab, not a few seconds later.
    while (FishingState.fishes.length < FishingState.maxConcurrent()) spawnFish();
    spawnTimer = setInterval(attemptSpawn, 1400);
  }
  document.getElementById('pond').classList.remove('paused');
}

function shakeCastInput() {
  const input = document.getElementById('cast-input');
  input.classList.remove('shake');
  // eslint-disable-next-line no-unused-expressions
  input.offsetWidth; // restart animation
  input.classList.add('shake');
}

function initFishing() {
  FishingState.load();
  updateStatsUI();
  renderShop();
  renderCollection();

  const mcToggle = document.getElementById('fish-mc-toggle');
  mcToggle.checked = FishingState.multipleChoice;
  mcToggle.addEventListener('change', () => {
    FishingState.multipleChoice = mcToggle.checked;
    FishingState.save();
    renderAnswerArea();
  });

  document.getElementById('cast-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('cast-input');
    const val = input.value;
    if (!val.trim()) return;

    const fish = FishingState.fishes.find((f) => f.id === FishingState.selectedId);
    if (!fish) {
      showMessage('Cast near a fish first — click one to target it!', 'muted');
      return;
    }
    if (fish.caught || fish.locked) return;

    if (Game.checkAnswer(val, fish.question)) {
      handleCatch(fish);
      input.value = '';
      updateCastPreview();
    } else {
      // One guess — same rule as multiple-choice mode: a wrong answer
      // loses the fish, and hands off to the full lesson card.
      fish.locked = true;
      shakeCastInput();
      setTimeout(() => {
        showLesson(fish);
        input.value = '';
        updateCastPreview();
      }, 500);
    }
  });
  document.getElementById('cast-input').addEventListener('input', updateCastPreview);
  document.getElementById('dont-know-btn').addEventListener('click', handleDontKnow);
  document.getElementById('lesson-next-btn').addEventListener('click', dismissLesson);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'fishing') resumeFishing();
      else pauseFishing();
    });
  });
}

document.addEventListener('DOMContentLoaded', initFishing);
