/* ------------------------------------------------------------------
   UI wiring
------------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

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
  el('number-range-row').style.display = Game.mode === 'counters' ? 'none' : '';
  el('counter-select-row').style.display = Game.mode === 'numbers' ? 'none' : '';
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
  COUNTERS.forEach((c) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (Game.enabledCounters.includes(c.id) ? ' active' : '');
    chip.textContent = `${c.icon} ${c.label}`;
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

function initMultipleChoiceToggle() {
  const toggle = el('mc-toggle');
  toggle.checked = Game.multipleChoice;
  toggle.addEventListener('change', () => {
    Game.multipleChoice = toggle.checked;
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

function startNewQuestion() {
  if (Game.enabledCounters.length === 0 && Game.mode !== 'numbers') {
    el('quiz-prompt').textContent = 'Select at least one counter';
    el('quiz-sublabel').textContent = '';
    el('answer-form').hidden = true;
    el('choice-grid').hidden = true;
    return;
  }
  el('answer-form').hidden = false;

  const q = Game.next();
  el('quiz-icon').textContent = q.icon;
  el('quiz-prompt').textContent = q.promptKanji;
  el('quiz-sublabel').textContent = q.promptLabel;
  el('feedback').textContent = '';
  el('feedback').className = 'feedback';
  el('explanation').textContent = '';
  el('next-btn').hidden = true;
  el('answer-input').value = '';
  el('answer-input').disabled = false;

  const choiceGrid = el('choice-grid');
  choiceGrid.innerHTML = '';
  if (Game.multipleChoice) {
    el('answer-form').hidden = true;
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
    fb.textContent = `✗ Not quite. Correct answer: ${q.romaji} (${q.hiragana})`;
    fb.className = 'feedback incorrect';
  }

  if (q.explanation) {
    el('explanation').textContent = `💡 ${q.explanation}`;
  }

  if (choiceBtn) {
    const buttons = el('choice-grid').querySelectorAll('button');
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.romaji) b.classList.add('correct');
      else if (b === choiceBtn) b.classList.add('incorrect');
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
  wrap.innerHTML = COUNTERS.map((c) => {
    const items = c.readings
      .map((r, i) => `<div class="counter-ref-item"><span class="n">${i + 1}</span>${r.romaji}<br>${r.hiragana}</div>`)
      .join('');
    const irregular20 = c.irregular20
      ? `<div class="counter-ref-item"><span class="n">20</span>${c.irregular20.romaji}<br>${c.irregular20.hiragana}</div>`
      : '';
    return `
      <div class="counter-ref-card">
        <h3>${c.icon} ${c.label}</h3>
        <div class="counter-ref-meaning">${c.meaning}</div>
        <div class="counter-ref-note">💡 ${c.note}</div>
        <div class="counter-ref-grid">${items}${irregular20}</div>
      </div>
    `;
  }).join('');
}

function init() {
  Game.loadSettings();

  initTabs();
  initModeSelect();
  initNumberRange();
  renderCounterChips();
  initCounterActions();
  initMultipleChoiceToggle();
  initAnswerForm();

  // reflect loaded mode in the segmented control
  document.querySelectorAll('#mode-select button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === Game.mode);
  });
  updateSettingsVisibility();

  buildDigitReference();
  buildCounterReference();

  updateScoreboard();
  startNewQuestion();
}

document.addEventListener('DOMContentLoaded', init);
