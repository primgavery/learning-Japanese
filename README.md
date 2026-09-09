# 数え方 (Kazoekata) — Japanese Numbers & Counters Trainer

https://primgavery.github.io/learning-Japanese/

A small browser-based quiz app for practicing some of the hardest parts of
Japanese for Spanish/English speakers: **numbers** (up to 99,999),
**counters (助数詞)** — the different words Japanese uses depending on what
you're counting (人 for people, 本 for long thin objects, 匹 for small
animals, 枚 for flat objects, and so on), and **telling time** (何時何分),
including the sound changes (gemination, h→p/b, irregular hour readings,
etc.) that go with all of them.

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
  irregular sound changes (100=ひゃく not いちひゃく, 300=さんびゃく,
  600=ろっぴゃく, 800=はっぴゃく, 1000=せん not いっせん, 3000=さんぜん,
  8000=はっせん, etc).
- **Counters mode** — practice 15 common counters (人, 個, 本, 枚, 匹, 頭,
  冊, 階, 回, 歳, 円, 分, 杯, 台, つ), with an explanation of the sound-change
  pattern shown after each answer. Counters are **ranked by how commonly
  they're used** (つ and 人 are the two most essential) and, by default, the
  quiz weights questions toward the common ones — toggleable — so practice
  time goes where it matters most. Toggle which counters are in the pool.
- **Time mode** — practice telling time in 5-minute increments, including
  the irregular hour readings (4時=よじ, 7時=しちじ, 9時=くじ — none of
  which follow the normal digit series) and はん for the half hour.
- **Mixed mode** — draws from all three.
- **Sentence mode** — wraps each prompt in a short beginner-friendly English
  sentence for context (e.g. "There are 3 pencils in the box.") instead of a
  bare flashcard fragment. Toggleable.
- **Typing or multiple choice** — type the reading (romaji or hiragana), or
  switch to multiple choice; distractors are drawn from the same counter's
  other readings (or, for time, the classic "regular digit + ji" mistake for
  irregular hours) so you have to notice the actual sound change, not just
  guess.
- **Live romaji → hiragana preview** — as you type a romaji answer, a
  hand-rolled converter (`js/romaji.js`, no external IME/library) shows the
  matching hiragana live underneath the input. Typed hiragana is accepted
  directly too, and grading itself falls back to the same converter so
  alternate romanizations (e.g. "si"/"tu"/"hu" Kunrei-style spellings) are
  still recognized.
- **Reference tab** — full 1–10 tables for every counter (sorted by
  commonality, with "Most common"/"Common" badges), the core number-building
  blocks, and the full 1–12 hour table with irregulars flagged.
- Score, streak, and a "recently missed" review list — all persisted in
  `localStorage` so your settings and best streak survive a refresh.

## Project structure

```
index.html        page layout
css/style.css      styling (light/dark aware)
js/romaji.js       romaji -> hiragana converter (mora table, sokuon, digraphs)
js/data.js         number/time reading generators + counter data tables (ranked)
js/game.js         quiz engine (question generation, weighted selection, grading, scoring)
js/main.js         DOM wiring
```
