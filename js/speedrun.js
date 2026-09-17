/* ------------------------------------------------------------------
   Hiragana speed run — a bounded, timed challenge distinct from the
   regular Kana quiz mode: every hiragana once, in random order, no
   going back to fix a wrong one. Misses are reviewed in a single pass
   at the end, then you're free to start another run.
------------------------------------------------------------------- */

const SpeedRun = {
  deck: [],
  index: 0,
  wrong: [], // { entry, typed }
  startTime: 0,
  timerHandle: null,
  reviewing: false,
  bestTimeMs: null,

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('jp-speedrun-hiragana') || '{}');
      if (typeof saved.bestTimeMs === 'number') this.bestTimeMs = saved.bestTimeMs;
    } catch (e) {
      /* ignore corrupt storage */
    }
  },

  save() {
    localStorage.setItem('jp-speedrun-hiragana', JSON.stringify({ bestTimeMs: this.bestTimeMs }));
  },
};

function shuffledHiraganaDeck() {
  const deck = KANA_CHART.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function formatSpeedRunTime(ms) {
  const totalSeconds = ms / 1000;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${s.toFixed(1).padStart(4, '0')}` : `${s.toFixed(1)}s`;
}

function checkKanaAnswer(raw, entry) {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (isHiraganaInput(trimmed)) return trimmed === entry.hiragana;
  if (normalize(trimmed) === normalize(entry.romaji)) return true;
  return romajiToHiragana(trimmed) === entry.hiragana;
}

function srEl(id) {
  return document.getElementById(id);
}

function updateSpeedRunBestLabel() {
  const el = srEl('speedrun-best');
  el.textContent = SpeedRun.bestTimeMs != null ? `Best time: ${formatSpeedRunTime(SpeedRun.bestTimeMs)}` : '';
}

function showSpeedRunView(name) {
  // name: 'settings' | 'run' | 'results'
  // Using style.display rather than the `hidden` attribute: `.scoreboard`
  // (and other classed panels) set `display` in CSS at higher specificity
  // than the browser's default `[hidden] { display: none }`, which would
  // otherwise silently no-op.
  const showSettings = name === 'settings' ? '' : 'none';
  document.querySelector('.scoreboard').style.display = showSettings;
  document.querySelector('.settings-panel').style.display = showSettings;
  document.querySelector('.quiz-card').style.display = showSettings;
  srEl('missed-panel').hidden = true; // stays hidden throughout; it belongs to the normal quiz flow
  srEl('speedrun-panel').hidden = name !== 'run';
  srEl('speedrun-results').hidden = name !== 'results';
}

function startSpeedRun() {
  SpeedRun.deck = shuffledHiraganaDeck();
  SpeedRun.index = 0;
  SpeedRun.wrong = [];
  SpeedRun.reviewing = false;
  SpeedRun.startTime = performance.now();
  clearInterval(SpeedRun.timerHandle);
  SpeedRun.timerHandle = setInterval(updateSpeedRunTimerDisplay, 100);

  showSpeedRunView('run');
  renderSpeedRunPrompt();
  srEl('speedrun-input').value = '';
  srEl('speedrun-input').focus();
}

function startReview() {
  SpeedRun.deck = SpeedRun.wrong.map((w) => w.entry);
  for (let i = SpeedRun.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [SpeedRun.deck[i], SpeedRun.deck[j]] = [SpeedRun.deck[j], SpeedRun.deck[i]];
  }
  SpeedRun.index = 0;
  SpeedRun.wrong = [];
  SpeedRun.reviewing = true;
  SpeedRun.startTime = performance.now();
  clearInterval(SpeedRun.timerHandle);
  SpeedRun.timerHandle = setInterval(updateSpeedRunTimerDisplay, 100);

  showSpeedRunView('run');
  renderSpeedRunPrompt();
  srEl('speedrun-input').value = '';
  srEl('speedrun-input').focus();
}

function updateSpeedRunTimerDisplay() {
  srEl('speedrun-timer').textContent = formatSpeedRunTime(performance.now() - SpeedRun.startTime);
}

function renderSpeedRunPrompt() {
  const entry = SpeedRun.deck[SpeedRun.index];
  srEl('speedrun-progress').textContent = `${SpeedRun.index + 1} / ${SpeedRun.deck.length}${SpeedRun.reviewing ? ' (review)' : ''}`;
  srEl('speedrun-prompt').textContent = entry.hiragana;
  updateSpeedRunHiraganaPreview();
}

function updateSpeedRunHiraganaPreview() {
  const raw = srEl('speedrun-input').value;
  const preview = srEl('speedrun-hiragana-preview');
  if (!raw.trim()) {
    preview.innerHTML = '&nbsp;';
    return;
  }
  preview.textContent = isHiraganaInput(raw) ? raw : romajiToHiragana(raw);
}

function flashSpeedRunInput(correct) {
  const input = srEl('speedrun-input');
  input.classList.remove('flash-correct', 'flash-incorrect');
  void input.offsetWidth;
  input.classList.add(correct ? 'flash-correct' : 'flash-incorrect');
}

function submitSpeedRunAnswer() {
  const input = srEl('speedrun-input');
  const val = input.value;
  if (!val.trim()) return;

  const entry = SpeedRun.deck[SpeedRun.index];
  const correct = checkKanaAnswer(val, entry);
  Mastery.record(`kana:${entry.hiragana}`, correct);
  flashSpeedRunInput(correct);
  if (!correct) SpeedRun.wrong.push({ entry, typed: val.trim() });

  SpeedRun.index += 1;
  input.value = '';
  updateSpeedRunHiraganaPreview();

  if (SpeedRun.index >= SpeedRun.deck.length) {
    finishSpeedRun();
    return;
  }
  renderSpeedRunPrompt();
}

function finishSpeedRun() {
  clearInterval(SpeedRun.timerHandle);
  const elapsedMs = performance.now() - SpeedRun.startTime;
  const total = SpeedRun.index;
  const correctCount = total - SpeedRun.wrong.length;

  srEl('speedrun-results-title').textContent = SpeedRun.reviewing ? 'Review complete!' : 'Speed run complete!';
  srEl('result-time').textContent = formatSpeedRunTime(elapsedMs);
  srEl('result-score').textContent = `${correctCount}/${total}`;

  const banner = srEl('speedrun-best-banner');
  if (!SpeedRun.reviewing && (SpeedRun.bestTimeMs == null || elapsedMs < SpeedRun.bestTimeMs)) {
    SpeedRun.bestTimeMs = elapsedMs;
    SpeedRun.save();
    banner.hidden = false;
    banner.textContent = '🎉 New best time!';
  } else {
    banner.hidden = true;
  }
  updateSpeedRunBestLabel();

  const missedList = srEl('speedrun-missed-review');
  if (SpeedRun.wrong.length) {
    missedList.innerHTML = `
      <h3>Missed (${SpeedRun.wrong.length})</h3>
      <ul class="weak-items-list">
        ${SpeedRun.wrong
          .map((w) => `<li><span>${w.entry.hiragana} — you typed "${w.typed}"</span><span class="weak-item-seen">${w.entry.romaji}</span></li>`)
          .join('')}
      </ul>
    `;
  } else {
    missedList.innerHTML = '<p class="hint">Perfect run — nothing to review! 🎉</p>';
  }

  srEl('review-missed-btn').hidden = SpeedRun.wrong.length === 0;
  showSpeedRunView('results');
}

function cancelSpeedRun() {
  clearInterval(SpeedRun.timerHandle);
  showSpeedRunView('settings');
}

function initSpeedRun() {
  SpeedRun.load();
  updateSpeedRunBestLabel();

  srEl('start-speedrun-btn').addEventListener('click', startSpeedRun);
  srEl('new-speedrun-btn').addEventListener('click', startSpeedRun);
  srEl('review-missed-btn').addEventListener('click', startReview);
  srEl('cancel-speedrun-btn').addEventListener('click', cancelSpeedRun);
  srEl('exit-speedrun-btn').addEventListener('click', cancelSpeedRun);

  srEl('speedrun-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitSpeedRunAnswer();
  });
  srEl('speedrun-input').addEventListener('input', updateSpeedRunHiraganaPreview);
}

document.addEventListener('DOMContentLoaded', initSpeedRun);
