/* ------------------------------------------------------------------
   UI wiring
------------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

function sortedByRank(list) {
  return [...list].sort((a, b) => a.rank - b.rank);
}

function rankBadge(rank) {
  if (rank <= 2) return '⭐ Most common';
  if (rank <= 6) return '● Common';
  return '';
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      el(btn.dataset.tab + '-view').classList.add('active');
    });
  });
}

function initModeSelect() {
  const wrap = el('mode-select');
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Game.mode = btn.dataset.mode;
      Game.saveSettings();
      updateSettingsVisibility();
      startNewQuestion();
    });
  });
}

function updateSettingsVisibility() {
  const showNumbers = Game.mode === 'numbers' || Game.mode === 'mixed';
  const showCounters = Game.mode === 'counters' || Game.mode === 'mixed';
  const showKana = Game.mode === 'kana';
  el('number-range-row').style.display = showNumbers ? '' : 'none';
  el('counter-select-row').style.display = showCounters ? '' : 'none';
  el('prioritize-row').style.display = showCounters ? '' : 'none';
  el('kana-system-row').style.display = showKana ? '' : 'none';
}

function initKanaSystemSelect() {
  const wrap = el('kana-system-select');
  wrap.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.system === Game.kanaSystem);
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Game.kanaSystem = btn.dataset.system;
      Game.saveSettings();
      startNewQuestion();
    });
  });
}

function initNumberRange() {
  const sel = el('number-max');
  sel.value = String(Game.numberMax);
  sel.addEventListener('change', () => {
    Game.numberMax = parseInt(sel.value, 10);
    Game.saveSettings();
    startNewQuestion();
  });
}

function renderCounterChips() {
  const list = el('counter-chip-list');
  list.innerHTML = '';
  sortedByRank(COUNTERS).forEach((c) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (Game.enabledCounters.includes(c.id) ? ' active' : '');
    const badge = rankBadge(c.rank);
    chip.innerHTML = `${c.icon} ${c.label}${badge ? `<span class="chip-badge">${badge}</span>` : ''}`;
    chip.addEventListener('click', () => {
      const idx = Game.enabledCounters.indexOf(c.id);
      if (idx >= 0) Game.enabledCounters.splice(idx, 1);
      else Game.enabledCounters.push(c.id);
      chip.classList.toggle('active');
      Game.saveSettings();
      startNewQuestion();
    });
    list.appendChild(chip);
  });
}

function initCounterActions() {
  el('counters-all').addEventListener('click', () => {
    Game.enabledCounters = COUNTERS.map((c) => c.id);
    renderCounterChips();
    Game.saveSettings();
    startNewQuestion();
  });
  el('counters-none').addEventListener('click', () => {
    Game.enabledCounters = [];
    renderCounterChips();
    Game.saveSettings();
  });
}

function initToggle(id, gameKey) {
  const toggle = el(id);
  toggle.checked = Game[gameKey];
  toggle.addEventListener('change', () => {
    Game[gameKey] = toggle.checked;
    Game.saveSettings();
    startNewQuestion();
  });
}

function updateScoreboard() {
  el('stat-score').textContent = Game.score;
  el('stat-answered').textContent = Game.answered;
  el('stat-streak').textContent = Game.streak;
  el('stat-best').textContent = Game.bestStreak;
}

function renderMissed() {
  const panel = el('missed-panel');
  const list = el('missed-list');
  if (!Game.missed.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  list.innerHTML = '';
  Game.missed
    .slice(-8)
    .reverse()
    .forEach((m) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${m.promptKanji} <span style="color:var(--text-muted)">(${m.promptLabel})</span></span><span class="missed-answer">${m.romaji}</span>`;
      list.appendChild(li);
    });
}

function updateHiraganaPreview() {
  const raw = el('answer-input').value;
  const preview = el('hiragana-preview');
  if (!raw.trim()) {
    preview.innerHTML = '&nbsp;';
    return;
  }
  if (isHiraganaInput(raw)) {
    preview.textContent = raw;
  } else {
    preview.textContent = romajiToHiragana(raw);
  }
}

function startNewQuestion() {
  if (Game.enabledCounters.length === 0 && (Game.mode === 'counters' || Game.mode === 'mixed')) {
    el('quiz-prompt').textContent = 'Select at least one counter';
    el('quiz-sublabel').textContent = '';
    el('quiz-sentence').textContent = '';
    el('answer-form').hidden = true;
    el('choice-grid').hidden = true;
    return;
  }
  el('answer-form').hidden = false;

  const q = Game.next();
  el('quiz-icon').textContent = q.icon;
  el('quiz-prompt').textContent = q.promptKanji;
  el('quiz-sublabel').textContent = q.sentence ? '' : q.promptLabel;
  el('quiz-sentence').textContent = q.sentence || '';
  el('feedback').textContent = '';
  el('feedback').className = 'feedback';
  el('explanation').textContent = '';
  el('next-btn').hidden = true;
  el('answer-input').value = '';
  el('answer-input').disabled = false;
  updateHiraganaPreview();

  const choiceGrid = el('choice-grid');
  choiceGrid.innerHTML = '';
  if (Game.multipleChoice) {
    el('answer-form').hidden = true;
    el('hiragana-preview').hidden = true;
    choiceGrid.hidden = false;
    q.choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.addEventListener('click', () => handleAnswer(choice, btn));
      choiceGrid.appendChild(btn);
    });
  } else {
    choiceGrid.hidden = true;
    el('hiragana-preview').hidden = false;
    el('answer-input').focus();
  }
}

function handleAnswer(rawAnswer, choiceBtn) {
  const q = Game.current;
  const correct = Game.submit(rawAnswer);

  const fb = el('feedback');
  if (correct) {
    fb.textContent = '✓ Correct!';
    fb.className = 'feedback correct';
  } else {
    fb.textContent = `✗ Not quite. Correct answer: ${q.romajiDisplay || q.romaji} (${q.hiraganaDisplay || q.hiragana})`;
    fb.className = 'feedback incorrect';
  }

  if (q.explanation) {
    el('explanation').textContent = `💡 ${q.explanation}`;
  }

  if (choiceBtn) {
    const buttons = el('choice-grid').querySelectorAll('button');
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.choices.find((c) => normalize(c) === q.accepted[0])) b.classList.add('correct');
      else if (b === choiceBtn && !correct) b.classList.add('incorrect');
    });
  } else {
    el('answer-input').disabled = true;
  }

  el('next-btn').hidden = false;
  el('next-btn').focus();
  updateScoreboard();
  renderMissed();
}

function initAnswerForm() {
  el('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = el('answer-input').value;
    if (!val.trim()) return;
    handleAnswer(val, null);
  });
  el('answer-input').addEventListener('input', updateHiraganaPreview);
  el('next-btn').addEventListener('click', startNewQuestion);
}

function buildDigitReference() {
  const tbody = el('digit-ref');
  const rows = [
    [1, 'ichi', 'いち'], [2, 'ni', 'に'], [3, 'san', 'さん'], [4, 'yon', 'よん'],
    [5, 'go', 'ご'], [6, 'roku', 'ろく'], [7, 'nana', 'なな'], [8, 'hachi', 'はち'],
    [9, 'kyuu', 'きゅう'], [10, 'juu', 'じゅう'], [100, 'hyaku', 'ひゃく'],
    [1000, 'sen', 'せん'], [10000, 'man', 'まん'],
  ];
  tbody.innerHTML = rows
    .map(([n, r, h]) => `<tr><td>${n.toLocaleString('en-US')}</td><td>${r}</td><td>${h}</td></tr>`)
    .join('');
}

function buildCounterReference() {
  const wrap = el('counter-reference');
  wrap.innerHTML = sortedByRank(COUNTERS).map((c) => {
    const items = c.readings
      .map((r, i) => `<div class="counter-ref-item"><span class="n">${i + 1}</span>${r.romaji}<br>${r.hiragana}</div>`)
      .join('');
    const irregular20 = c.irregular20
      ? `<div class="counter-ref-item"><span class="n">20</span>${c.irregular20.romaji}<br>${c.irregular20.hiragana}</div>`
      : '';
    const badge = rankBadge(c.rank);
    return `
      <div class="counter-ref-card">
        <h3>${c.icon} ${c.label}${badge ? `<span class="chip-badge">${badge}</span>` : ''}</h3>
        <div class="counter-ref-meaning">${c.meaning}</div>
        <div class="counter-ref-note">💡 ${c.note}</div>
        <div class="counter-ref-grid">${items}${irregular20}</div>
      </div>
    `;
  }).join('');
}

function buildHourReference() {
  const tbody = el('hour-ref');
  const rows = [];
  for (let h = 1; h <= 12; h++) {
    const irregular = IRREGULAR_HOURS.has(h) ? ' ⚠️ irregular' : '';
    rows.push(`<tr><td>${h}時${irregular}</td><td>${HOUR_R[h]}</td><td>${HOUR_H[h]}</td></tr>`);
  }
  tbody.innerHTML = rows.join('');
}

const KANA_ROW_DEFS = [
  ['a', 'i', 'u', 'e', 'o'],
  ['ka', 'ki', 'ku', 'ke', 'ko'],
  ['sa', 'shi', 'su', 'se', 'so'],
  ['ta', 'chi', 'tsu', 'te', 'to'],
  ['na', 'ni', 'nu', 'ne', 'no'],
  ['ha', 'hi', 'fu', 'he', 'ho'],
  ['ma', 'mi', 'mu', 'me', 'mo'],
  ['ya', null, 'yu', null, 'yo'],
  ['ra', 'ri', 'ru', 're', 'ro'],
  ['wa', null, null, null, 'wo'],
  ['n', null, null, null, null],
  ['ga', 'gi', 'gu', 'ge', 'go'],
  ['za', 'ji', 'zu', 'ze', 'zo'],
  ['da', 'di', 'du', 'de', 'do'],
  ['ba', 'bi', 'bu', 'be', 'bo'],
  ['pa', 'pi', 'pu', 'pe', 'po'],
];

const KANA_YOUON_ROWS = [
  ['kya', 'kyu', 'kyo'],
  ['sha', 'shu', 'sho'],
  ['cha', 'chu', 'cho'],
  ['nya', 'nyu', 'nyo'],
  ['hya', 'hyu', 'hyo'],
  ['mya', 'myu', 'myo'],
  ['rya', 'ryu', 'ryo'],
  ['gya', 'gyu', 'gyo'],
  ['ja', 'ju', 'jo'],
  ['bya', 'byu', 'byo'],
  ['pya', 'pyu', 'pyo'],
];

function buildKanaReference() {
  const byRomaji = {};
  KANA_CHART.forEach((e) => { byRomaji[e.romaji] = e; });

  const cell = (romaji) => {
    if (!romaji) return '<div class="kana-cell kana-cell-empty"></div>';
    const e = byRomaji[romaji];
    if (!e) return '<div class="kana-cell kana-cell-empty"></div>';
    return `<div class="kana-cell"><div class="kana-glyphs">${e.hiragana} ${e.katakana}</div><div class="kana-romaji">${e.romaji}</div></div>`;
  };

  const mainGrid = KANA_ROW_DEFS.map((row) => `<div class="kana-row">${row.map(cell).join('')}</div>`).join('');
  const youonGrid = KANA_YOUON_ROWS.map((row) => `<div class="kana-row kana-row-youon">${row.map(cell).join('')}</div>`).join('');

  el('kana-reference').innerHTML = `
    <div class="kana-grid">${mainGrid}</div>
    <h3 class="kana-subheading">Combined sounds (拗音)</h3>
    <div class="kana-grid">${youonGrid}</div>
  `;
}

function init() {
  Game.loadSettings();

  initTabs();
  initModeSelect();
  initNumberRange();
  renderCounterChips();
  initCounterActions();
  initToggle('mc-toggle', 'multipleChoice');
  initToggle('sentence-toggle', 'sentenceMode');
  initToggle('prioritize-toggle', 'prioritizeCommon');
  initKanaSystemSelect();
  initAnswerForm();

  // reflect loaded mode in the segmented control
  document.querySelectorAll('#mode-select button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === Game.mode);
  });
  updateSettingsVisibility();

  buildKanaReference();
  buildDigitReference();
  buildCounterReference();
  buildHourReference();

  updateScoreboard();
  startNewQuestion();
}

document.addEventListener('DOMContentLoaded', init);
