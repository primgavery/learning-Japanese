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
      // Rendered fresh on every visit (not at page load) so it's always
      // current — Fishing's own state hasn't loaded yet at page-load time,
      // and either way you want to see whatever just changed.
      if (btn.dataset.tab === 'progress') buildProgressDashboard();
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

/* ------------------------------------------------------------------
   Progress dashboard — reads Game, FishingState, and Mastery directly
   (not cached), so it's always showing the current state whenever the
   tab is opened.
------------------------------------------------------------------- */

function labelForMasteryKey(key) {
  const parts = key.split(':');
  if (parts[0] === 'counter') {
    const [, id, count] = parts;
    const c = COUNTERS.find((x) => x.id === id);
    if (!c) return key;
    const reading = count === '20' ? c.irregular20 : c.readings[Number(count) - 1];
    return `${count}${c.kanji} (${reading ? reading.romaji : '?'})`;
  }
  if (parts[0] === 'time') {
    const h = Number(parts[1]);
    return `${h}時 (${HOUR_R[h]})`;
  }
  if (parts[0] === 'kana') {
    const entry = KANA_CHART.find((e) => e.hiragana === parts[1]);
    return entry ? `${entry.hiragana} (${entry.romaji})` : key;
  }
  if (parts[0] === 'date' && parts[1] === 'month') {
    const m = Number(parts[2]);
    return `${m}月 (${MONTH_R[m]})`;
  }
  if (parts[0] === 'date' && parts[1] === 'day') {
    const d = Number(parts[2]);
    return `${d}日 (${DAY_R[d]})`;
  }
  if (parts[0] === 'date' && parts[1] === 'weekday') {
    const w = WEEKDAYS[Number(parts[2])];
    return w ? `${w.kanji} (${w.romaji})` : key;
  }
  if (parts[0] === 'phrase') {
    const p = PHRASES[Number(parts[1])];
    return p ? `${p.en} → ${p.romaji}` : key;
  }
  return key;
}

const MASTERY_CATEGORIES = [
  { label: 'Counters', match: (k) => k.startsWith('counter:') },
  { label: 'Time', match: (k) => k.startsWith('time:') },
  { label: 'Kana', match: (k) => k.startsWith('kana:') },
  { label: 'Dates', match: (k) => k.startsWith('date:') },
  { label: 'Phrases', match: (k) => k.startsWith('phrase:') },
];

const MASTERY_BOX_COLORS = ['#c9514f', '#d9883d', '#d9c23d', '#8fbf5f', '#4caf6b'];

function categoryBoxCounts(match) {
  const counts = [0, 0, 0, 0, 0];
  Object.entries(Mastery.items).forEach(([k, v]) => {
    if (match(k)) counts[v.box] += 1;
  });
  return counts;
}

function renderMasteryBreakdown() {
  el('mastery-breakdown').innerHTML = MASTERY_CATEGORIES.map((cat) => {
    const counts = categoryBoxCounts(cat.match);
    const total = counts.reduce((a, b) => a + b, 0);
    if (total === 0) {
      return `<div class="mastery-row"><span class="mastery-label">${cat.label}</span><span class="mastery-empty">Not practiced yet</span></div>`;
    }
    const segments = counts
      .map((c, i) => (c > 0 ? `<div class="mastery-seg" style="flex:${c};background:${MASTERY_BOX_COLORS[i]}" title="${c} at box ${i}"></div>` : ''))
      .join('');
    return `
      <div class="mastery-row">
        <span class="mastery-label">${cat.label} <span class="mastery-count">${total} tracked</span></span>
        <div class="mastery-bar">${segments}</div>
      </div>
    `;
  }).join('');
}

function renderWeakItems() {
  const weak = Object.entries(Mastery.items)
    .filter(([, v]) => v.box === 0)
    .sort((a, b) => b[1].seen - a[1].seen)
    .slice(0, 8);

  const list = el('weak-items-list');
  if (!weak.length) {
    list.innerHTML = '<li class="weak-item-empty">Nothing flagged yet — keep practicing!</li>';
    return;
  }
  list.innerHTML = weak
    .map(([k, v]) => `<li><span>${labelForMasteryKey(k)}</span><span class="weak-item-seen">seen ×${v.seen}</span></li>`)
    .join('');
}

function renderProgressOverview() {
  const achievementsUnlocked = Object.keys(FishingState.unlocked || {}).length;
  el('progress-overview').innerHTML = `
    <div class="progress-group">
      <h3>Quiz</h3>
      <div class="progress-stats">
        <div class="progress-stat"><span class="progress-stat-value">${Game.score}</span><span class="progress-stat-label">Correct</span></div>
        <div class="progress-stat"><span class="progress-stat-value">${Game.answered}</span><span class="progress-stat-label">Answered</span></div>
        <div class="progress-stat"><span class="progress-stat-value">${Game.bestStreak}</span><span class="progress-stat-label">Best streak</span></div>
      </div>
    </div>
    <div class="progress-group">
      <h3>Fishing</h3>
      <div class="progress-stats">
        <div class="progress-stat"><span class="progress-stat-value">🪙${FishingState.coins}</span><span class="progress-stat-label">Coins</span></div>
        <div class="progress-stat"><span class="progress-stat-value">${FishingState.totalCaught}</span><span class="progress-stat-label">Fish caught</span></div>
        <div class="progress-stat"><span class="progress-stat-value">${FishingState.bestCombo}</span><span class="progress-stat-label">Best combo</span></div>
        <div class="progress-stat"><span class="progress-stat-value">🔥${FishingState.dayStreak}</span><span class="progress-stat-label">Day streak</span></div>
        <div class="progress-stat"><span class="progress-stat-value">${achievementsUnlocked}/${ACHIEVEMENTS.length}</span><span class="progress-stat-label">Achievements</span></div>
      </div>
    </div>
  `;
}

function buildProgressDashboard() {
  renderProgressOverview();
  renderMasteryBreakdown();
  renderWeakItems();
}

function exportProgress() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    quizSettings: JSON.parse(localStorage.getItem('jp-counters-settings') || '{}'),
    fishing: JSON.parse(localStorage.getItem('jp-fishing-save') || '{}'),
    mastery: JSON.parse(localStorage.getItem('jp-mastery') || '{}'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kazoekata-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      alert('Could not read that file — is it a progress export from this app?');
      return;
    }
    if (!confirm('This will replace your current progress on this device. Continue?')) return;
    if (data.quizSettings) localStorage.setItem('jp-counters-settings', JSON.stringify(data.quizSettings));
    if (data.fishing) localStorage.setItem('jp-fishing-save', JSON.stringify(data.fishing));
    if (data.mastery) localStorage.setItem('jp-mastery', JSON.stringify(data.mastery));
    location.reload();
  };
  reader.readAsText(file);
}

function initBackupControls() {
  el('export-btn').addEventListener('click', exportProgress);
  el('import-btn').addEventListener('click', () => el('import-input').click());
  el('import-input').addEventListener('change', (e) => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
  });
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
  initBackupControls();
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
