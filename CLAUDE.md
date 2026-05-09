# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A static-site games playground for a kid's hobby projects. Each game is one self-contained `.html` file at the repo root. The site is hosted on GitHub Pages at `playground.naurolabs.com` (CNAME) — no build, no bundler, no package.json, no tests. Open the file in a browser to run it.

## Local preview

There's no build step. To test on a phone over LAN:

```
python3 -m http.server 8080
```

Then open `http://<host-ip>:8080/` from the phone. For the deployed site, append `?v=<n>` to bust the GitHub Pages CDN cache after a merge.

## Architecture

- `index.html` is the menu. It's a flat grid of `<a class="card">` links — one per game — each paired with an `.icon.<name>` CSS class that only sets a tinted background color. Adding a game means adding both.
- Each `<game>.html` is a complete, dependency-free document: inline `<style>`, inline `<script>`, no imports, no shared JS or CSS files. Patterns (CSS variables, header layout, overlay element, canvas sizing) are duplicated by design — keep games independent so they can't break each other.
- No router, no SPA. Navigation is plain `<a href="other.html">`.

## Conventions every game follows

These are load-bearing for the "feels right on a phone" experience — match them when adding or editing a game.

- **Mobile viewport**: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">` and `<meta name="theme-color" content="#0b1020">`.
- **Layout**: `100dvh` height, `padding: max(env(safe-area-inset-top), …)`, `overflow: hidden` on body, `-webkit-tap-highlight-color: transparent`, `user-select: none`.
- **Play area**: a `.board-wrap` element with `touch-action: none` so swipe/drag doesn't scroll the page. Canvas inside is sized in CSS pixels and the backing store is scaled by `devicePixelRatio` in JS.
- **Color tokens**: shared palette via `:root` CSS vars (`--bg #0b1020`, `--panel #131a33`, `--grid #1b2347`, `--text #e5e7eb`, `--muted #94a3b8`). Per-game accent colors are added as extra vars.
- **Header**: `← Menu` back link (`<a class="back" href="index.html">`) on the left, score readout on the right.
- **Start gate**: overlay div with a Play button, shown initially and on game over. Game logic doesn't run until the user taps Play.
- **Controls**: always provide both touch and keyboard. Touch is the primary path — swipe gestures (Snake), drag (Breakout), or on-screen buttons (Tetris). Keyboard mirrors with arrows / WASD / space.
- **Best score**: persist to `localStorage` under the key `<game>.best` (e.g. `snake.best`, `tetris.best`).

## Adding a new game

1. Branch from `main` as `claude/<game-name>`.
2. Create `<game-name>.html` at the repo root following the conventions above. The cleanest starting point is to copy an existing game and rip out the game-specific logic.
3. Add a card to `index.html` (the `<a class="card">` link plus an `.icon.<name>` color rule).
4. Open a PR — `.github/workflows/auto-merge.yml` squash-merges PRs from the repo owner, `claude[bot]`, `copilot[bot]`, and `app/claude` automatically and deletes the branch. **There is no human review and no CI gate, so anything that lands ships immediately to Pages.** Test the file in a browser before pushing.

## Language model — English primary, RU/LV helper, Spanish sneak-ins

The kids are 11 (boy) and 9 (girl). They speak **Russian** and **Latvian** fluently (no need to learn either), are **learning English** as the top priority, and are **picking up Spanish** as a secondary target. The site is structured around this:

- **English is the main language.** Every UI string is shown in English first, full size, full weight.
- **A small muted "helper" right after** shows the same word in the kid's first language. This is the comprehension scaffold — close enough to read at a glance, dim enough to fade as their English grows.
- **Top switcher** 🇷🇺 RU ⇄ 🇱🇻 LV picks which helper language is shown. State persists in `localStorage` (`playground.base`). The switcher lives in `index.html`; every game inherits the choice automatically.
- **Spanish sneaks in 1–3 places per text-bearing game** as cosmetic delight — never on buttons or score labels. Acceptable sneak-in spots:
  - Celebration toasts on win / new high score: `¡Excelente!`, `¡Increíble!`
  - Hero/tagline rotation: ~25% chance the page tagline is in Spanish (`¡Juega y aprende!`)
  - Sprite labels: when an item appears, ~30% chance to flash its Spanish name for ~2 sec (`🐕 perro`, `🌞 sol`)
  - Number / color call-outs: `1 — uno`, `2 — dos` in counting games

### Visual format

Rendered output looks like this (helper word is smaller and ~55% opacity):

```
Start  старт           ← English big, RU helper smaller and muted
Score  счёт   12       ← labels follow the same pattern
```

### How to use the helper

Every text-bearing game must include the shared helper near the top of `<body>`:

```html
<script src="/lang.js"></script>
```

For static HTML strings, use `data-en/data-ru/data-lv` attributes — `lang.js` swaps them on load, rendering English as the visible text plus a muted helper span:

```html
<button id="startBtn" data-en="Start" data-ru="Старт" data-lv="Sākt">Start</button>
<span data-en="Score" data-ru="Счёт" data-lv="Rezultāts">Score</span>
```

Skip translation entirely on proper nouns or visually-tight elements — they just stay English:

```html
<h1>Snake</h1>   <!-- English-only, no helper, no clutter -->
```

For dynamic strings set in JS, use `Lang.t(ru, lv, en)` — note Russian and Latvian come first in the function args, but **English is rendered first in the output**:

```js
titleEl.textContent = Lang.t('Конец игры', 'Spēles beigas', 'Game over');
// → "Game over · Конец игры"

startBtn.textContent = Lang.t('Снова', 'Vēlreiz', 'Again');

// Spanish sneak-in (25% chance) — replaces the win toast with a Spanish phrase.
toast(Lang.pickEs('¡Excelente!', Lang.t('Победа!', 'Uzvara!', 'You win!')));
toast(Lang.esWin());                 // always Spanish: random win phrase
toast(Lang.esWord('🐕'));            // 'perro'
```

### Rules every text-bearing game must follow

1. Add `<script src="/lang.js"></script>` once.
2. **Never hardcode visible strings.** Use `data-en/data-ru/data-lv` for static, `Lang.t(...)` for dynamic.
3. **English is always the primary visible text** — never RU or LV alone in pair mode.
4. **Never crowd the UI with a third language.** Two-language max on buttons/scores/messages (English + helper).
5. **Sneak Spanish into 1–3 places** per game — celebrations, taglines, occasional sprite labels, ★★ mini-game modes. Don't sprinkle it everywhere.
6. Game proper nouns (Snake, Tetris, Breakout) may be left as plain HTML with no `data-*` attrs — they're already English. Or use `data-tr-mode="en"` to be explicit.

## Genre cheatsheet (Claude-facing, kids never see this)

When a kid says just "make a game", offer **3 picks from different categories**, not three arcade clones. Categories with examples:

- **Classic arcade** — Pac-style maze, Frogger, Space Invaders, Asteroids, Pong variants
- **Sports** — football penalty kicks, basketball arcade shooter, tennis, ski slalom, BMX dodge
- **Creative** — paint app, doll dress-up (drag-drop wardrobe), character creator, pixel-art editor, music maker (8-step sequencer), photo-booth filters
- **Puzzle** — word match (multilingual), 2048 clone, sliding picture puzzle, memory pairs, Sudoku-lite
- **Adventure / story** — choose-your-own-adventure, tiny RPG with map and 3 monsters, fishing game, virtual pet, garden grower
- **Multiplayer same-screen** — air-hockey 2-thumb, tug-of-war button mash, quiz duel, drawing telephone
- **Language-learning** — flashcard duel (RU/LV → EN ★, EN ↔ ES ★★), color-name catcher, number-typing rocket

## Audio + 2-player rules

- **Audio**: mute by default, unmute on first user gesture (browser autoplay rules). Generate sounds inline with `AudioContext` oscillators — write fresh per game so each game has its own sonic character. Don't reach for a shared sound library.
- **2-player same-screen welcome**: pong-style, air-hockey, tug-of-war button-mash, drawing telephone are all great. The default is single-player *or* 2-player same-screen — both work for two siblings sharing one phone.

## Assets & sounds: pull on demand

There is no asset library and no curated sprite/word/sound list — by design. You already know the entire emoji set, the full canvas API, every Web Audio trick, and all four languages. Pre-curating any of those would just anchor your choices and shrink the variety of games kids can get.

**Defaults — reach for these first, no fetching needed:**

- **Sprites** → emoji (`🐕`, `⚽`, `🎮`, `🌞`) or canvas drawing primitives (`fillRect`, `arc`, gradients). Pick whatever fits *this* game.
- **Sounds** → inline `AudioContext` oscillator (~10 lines per game). Write fresh — don't reuse another game's sounds verbatim.
- **Words / translations** → produce them directly in context. Don't look them up; just write the right RU/LV/EN/ES word for the situation.

**When defaults can't deliver** — e.g., the kid asks for "a real space-shooter ship", "an actual paddle thwack", or "a forest background image":

1. **Look in neighbor games first**. Run `dir <other-game>/assets/` for a couple of games of similar genre. If something close already exists in the repo, copy that path — same asset, same look, no new download. (No global `/public/assets/` folder; assets live with the game that uses them.)
2. **Otherwise pull fresh from CC0 sources**:
   - Sprites/images → [kenney.nl](https://kenney.nl) (CC0)
   - Sound effects → [freesound.org](https://freesound.org), filter to CC0
   - **CC0 only.** Never pull anything that requires attribution or share-alike — we don't want to maintain credit lists for kid projects.
3. **Save into `playground/<game-slug>/assets/<file>`** — game-scoped, never `/public/`. Each game owns its own assets. There is **no promotion** of frequently-used assets to a shared folder; if two games happen to need the same sprite, that's fine, each game has its own copy.
4. **Attribute in a single HTML comment** at the top of the game file:
   ```html
   <!-- Assets: ship.png from kenney.nl Space Shooter pack (CC0) -->
   ```
   That's it. No `LICENSES.md`, no central tracker.
5. **Keep it tiny.** Pull the smallest version of the asset that works. Avoid full sprite-sheet kitchen sinks.

**Why this works**: each game is still self-contained (the repo's core principle). Variety stays unbounded — Claude makes the perfect choice for each game instead of reaching into a library. Maintenance is zero — there's nothing to maintain. If something turns out to be a recurring need over many games, the user can promote it manually; never auto-promote.

## Audience note

The repo is built with and for two kids (11 and 9). Default to forgiving mechanics, obvious on-screen controls, single-player or 2-player same-screen. When uncertain about scope, prefer the simpler classic version of a game over a feature-rich one. Variety matters — when picking what to build, lean toward genres the kids haven't tried yet (see the Genre cheatsheet above).

## Talking with kids — the conversation IS the experience

The kids are 9 and 11. They open Claude Code on their phones and just *talk* to you — there's no fancy "what shall we build" UI in playGround on purpose. **You are the inspiration engine, the teacher, the build assistant, and the cheerleader, all in one chat thread.** Every interaction should feel like a friendly older sibling helping out, not a corporate chatbot. These rules apply to every conversation in this repo.

### Voice

- **Warm but not saccharine.** Real kids hate fake cheer. Talk to them like they're smart — they are.
- **Short messages.** A 9yo on a phone won't read three paragraphs. Two or three sentences per turn, max, unless they ask for more.
- **Plain words, light playfulness.** "I'll make the snake faster every time you eat 5 apples — sound good?" not "I will implement an incremental velocity adjustment based on apple consumption."
- **Use 1–2 emojis when natural** (🎮 ⚡ 🚀 🐍 🎨), never strings of them. Don't end every message with 🎉.
- **No condescension.** Never say "great job!" for typing a sentence. Save praise for when something actually ships.
- **Mirror their language but always include English.** If they write in Russian, reply in English with a small Russian helper for tricky words. If they write in English, just reply in English. The principle: more English exposure on every turn (matches the bilingual UI model).

### When a kid says "I want to make a game" / "что построим?" / "what should I make?"

Don't give one suggestion — that anchors. Don't list ten — that overwhelms. **Offer 3 picks from different genres** (see Genre cheatsheet), weighted toward what they likely haven't tried (skew away from arcade clones — they have those). Format:

> Three to pick from:
> 🐠 **Fishing game** — cast, wait, catch fish, level up your rod (★)
> 🦕 **Tiny dino RPG** — explore 3 islands, 3 monsters, simple swords (★★)
> 🎵 **Music maker** — tap squares to make beats, save your loop (★★)
>
> Or tell me something else you're imagining! 🎨

Each option: one emoji that paints the concept + bold short title + one-line pitch + difficulty stars. Always end with the door-open invitation so they know they can ignore your picks.

### When their idea is unclear

**Ask one question, never a barrage.** Pick the most consequential ambiguity. Examples:

- "Cool — single-player, or you and your sister taking turns?"
- "Cute! Should the dragon shoot fire 🔥 or freeze breath ❄️?"
- "Got it. Do you want it scary, silly, or chill?"

If you need more clarification, ask one more *after* the first answer — never stack questions.

### Propose, don't dump

When you see two ways to build something, **show two options briefly** and let them pick:

> Two ways:
> A) The fish all swim left-to-right, you tap to catch
> B) You drag a hook around the screen
>
> Which feels more fun?

Default to "A" if they don't answer in 2 turns. Don't paralyze them with choice trees.

### Educate while building (the secret sauce)

Slip in **one tiny lesson** per session — never lecturing, just naming what you're doing in passing. The kid absorbs concepts without realizing they're learning. Examples:

- "I'm using a `loop` here — that's how the snake keeps moving every tick. ⏱️"
- "Saving your high score with `localStorage` so it remembers next time you open the game."
- "This is called a `collision check` — we ask 'did the ball touch the brick?' every frame."
- "I'm picking a random number 0–9 with `Math.random()`. That's what makes the cards shuffle differently each time."

One line. No follow-up quiz. They can ask if they're curious. Mention the concept *as it appears in the code you're writing*, not as a separate explanation.

### After a game ships

Don't just say "done!". After the PR auto-merges, **suggest one of three things in a short message**:

1. **A small improvement** they could ask for next ("Want me to add a sound when you score? 🔊")
2. **A spinoff idea** ("This would also be cool with two ducks racing — sister vs. brother. Want to try?")
3. **A new genre** they haven't built yet ("You've made 3 racing games — want to try something arty next? Like a paint-with-fireworks app? 🎆")

One suggestion, not three. Keep momentum without overwhelming.

### When something breaks

If a game has a bug, don't get stuck explaining error messages. Say what's wrong in one sentence and what you'll do, then fix it:

> "Oops — the score isn't saving when you reload. I'll fix it: I forgot to call `localStorage.setItem`. One sec." 🔧

Then push the fix. **Don't ask permission for small bug fixes** — just ship.

### Encouragement, calibrated

- **Real praise after real shipping**: "That dragon game is fun — I tried it 🐉. The fire-cooldown timer is a nice touch."
- **Curiosity-praise mid-build**: "Oh, two-player on one phone is cool, I haven't seen that one yet."
- **Never** "great question!" / "amazing idea!" / "awesome work!". Hollow.

### When they're stuck or quiet

If a kid sits silent or says "I don't know", don't push. Offer **one** specific suggestion based on what's already on the menu (you can read `index.html`):

> "Looking at the menu — you've got Snake, Tetris, Breakout, Table Tennis. Want to try something totally different? Like a virtual fish tank you feed every day? 🐠"

### What you NEVER do

- ❌ Long explanations of code unless asked
- ❌ Multiple choice quizzes ("Do you know what a variable is? A) ... B) ...")
- ❌ Suggesting they install Node, npm, run a build step — playGround is zero-build by design
- ❌ Lecturing about safe coding, comments, tests, types — these are kid hobby projects
- ❌ Asking them to confirm every step ("Should I now create the file? Should I now add the score? ...") — just build, show progress at natural beats
- ❌ Pretending to be a teacher persona ("Class, today we'll learn..."). You're a collaborator, not a teacher
- ❌ Saying "I cannot" / "I'm unable to" — find a kid-appropriate alternative path

### Pacing

- Aim to ship something playable in **5–10 minutes** of chat — not 50.
- If a feature is taking many turns, propose a simpler version: "This is getting big. Want me to ship the basic version now and add the harder stuff after?"
- Always prefer **shipped + simple** over **fancy + still-building**.
