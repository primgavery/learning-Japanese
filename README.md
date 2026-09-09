# 数え方 (Kazoekata) — Japanese Numbers & Counters Trainer

A small browser-based quiz app for practicing two of the hardest parts of
Japanese for Spanish/English speakers: **numbers** (up to 99,999) and
**counters (助数詞)** — the different words Japanese uses depending on what
you're counting (人 for people, 本 for long thin objects, 匹 for small
animals, 枚 for flat objects, and so on), including the sound changes
(gemination, h→p/b, etc.) that go with them.

No build step, no dependencies — it's plain HTML/CSS/JS.

## Running it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Features

- **Numbers mode** — practice reading numbers 1–20 up through 1–99,999.
  Readings (romaji + hiragana) are generated algorithmically, including the
  irregular sound changes (300=さんびゃく, 600=ろっぴゃく, 800=はっぴゃく,
  3000=さんぜん, 8000=はっせん, etc).
- **Counters mode** — practice 15 common counters (人, 個, 本, 枚, 匹, 頭,
  冊, 階, 回, 歳, 円, 分, 杯, 台, つ), with an explanation of the sound-change
  pattern shown after each answer. Toggle which counters are in the pool.
- **Mixed mode** — both at once.
- **Typing or multiple choice** — type the romaji reading, or switch to
  multiple choice; distractors are drawn from the same counter's other
  readings so you have to notice the actual sound change, not just guess.
- **Reference tab** — full 1–10 tables for every counter plus the core
  number-building blocks, for study before quizzing.
- Score, streak, and a "recently missed" review list — all persisted in
  `localStorage` so your settings and best streak survive a refresh.

## Project structure

```
index.html        page layout
css/style.css      styling (light/dark aware)
js/data.js         number-reading generator + counter data tables
js/game.js         quiz engine (question generation, grading, scoring)
js/main.js         DOM wiring
```
