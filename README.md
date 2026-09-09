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

### 🎣 Fishing mini-game

A separate, more arcade-y way to practice the same content. Cast a line into
the pond; fish swim across tagged with a number, counter, or time (e.g. a
fish labeled "3匹"). Type the reading before it swims off to reel it in.

- **Rarity mirrors real-world usefulness, inverted for challenge** — common
  counters (つ, 人...) show up constantly as easy, low-value "common" fish so
  you get lots of low-stakes reps on what matters most in real life; rare
  counters (頭, 階...) show up rarely as high-value "epic" fish — a fun bonus
  challenge, not the main grind.
- **Coins & combo** — catches pay coins (more for rarer fish), and an
  unbroken catch streak raises a combo multiplier; letting one escape resets
  the combo (no other penalty — wrong guesses can just be retried before the
  fish swims off).
- **Tackle shop** — spend coins on Better Bait (more swim time), a Bigger Net
  (more fish on the line at once), and a Lucky Charm (better odds at rare
  fish).
- **Catch log** — a Pokédex-style collection grid: every counter (plus a
  rare "Clockfish" for time practice) is a species to discover; catching one
  for the first time reveals its meaning and sound-change note there.
- Pauses automatically when you switch tabs, and everything (coins,
  upgrades, catch log) is saved in `localStorage`.

## Project structure

```
index.html        page layout
css/style.css      styling (light/dark aware)
js/romaji.js       romaji -> hiragana converter (mora table, sokuon, digraphs)
js/data.js         number/time reading generators + counter data tables (ranked)
js/game.js         quiz engine (question generation, weighted selection, grading, scoring)
js/main.js         DOM wiring for the quiz/reference tabs
js/fishing.js       fishing mini-game (spawning, catching, shop, collection)
```
