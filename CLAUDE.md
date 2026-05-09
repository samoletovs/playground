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

## Language model — RU/LV switcher, English always paired, Spanish sneak-ins

The kids are 11 (boy) and 9 (girl). They speak **Russian** and **Latvian** fluently (no need to learn either), are **learning English** as the top priority, and are **picking up Spanish** as a secondary target. The site is structured around this:

- **Top switcher**: 🇷🇺 RU ⇄ 🇱🇻 LV picks the *base* language. State persists in `localStorage` (`playground.base`). The switcher lives in `index.html`; every game inherits the choice automatically.
- **English is always paired with the base** on every visible UI string — this is the constant English-learning workhorse. Format: `<base> / <english>` (e.g. `Старт / Start`, `Sākt / Start`, `Счёт / Score`).
- **Spanish sneaks in 1–3 places per text-bearing game** as cosmetic delight — never on buttons or score labels. Acceptable sneak-in spots:
  - Celebration toasts on win / new high score: `¡Excelente!`, `¡Increíble!`
  - Hero/tagline rotation: ~25% chance the page tagline is in Spanish (`¡Juega y aprende!`)
  - Sprite labels: when an item appears, ~30% chance to flash its Spanish name for ~2 sec (`🐕 perro`, `🌞 sol`)
  - Number / color call-outs: `1 — uno`, `2 — dos` in counting games

### How to use the helper

Every game must include the shared helper near the top of `<body>`:

```html
<script src="/lang.js"></script>
```

For static HTML strings, use `data-ru/data-lv/data-en` attributes — `lang.js` swaps them on load:

```html
<button id="startBtn" data-ru="Старт" data-lv="Sākt" data-en="Start">Start</button>
<div data-ru="Счёт" data-lv="Rezultāts" data-en="Score">Score</div>
<h1 data-ru="Змейка" data-lv="Čūska" data-tr-mode="base">Snake</h1>  <!-- base only -->
```

For dynamic strings set in JS, use `Lang.t(ru, lv, en)`:

```js
titleEl.textContent = Lang.t('Конец игры', 'Spēles beigas', 'Game over');
startBtn.textContent = Lang.t('Снова', 'Vēlreiz', 'Again');

// Spanish sneak-in (25% chance) — replaces the win toast with a Spanish phrase.
toast(Lang.pickEs('¡Excelente!', Lang.t('Победа!', 'Uzvara!', 'You win!')));
toast(Lang.esWin());                 // always Spanish: random win phrase
toast(Lang.esWord('🐕'));            // 'perro'
```

### Rules every text-bearing game must follow

1. Add `<script src="/lang.js"></script>` once.
2. **Never hardcode visible strings.** Use `data-ru/data-lv/data-en` for static, `Lang.t(...)` for dynamic.
3. **Never crowd the UI with a third language.** Two-language max on buttons/scores/messages (base + EN).
4. **Sneak Spanish into 1–3 places** per game — celebrations, taglines, occasional sprite labels, ★★ mini-game modes. Don't sprinkle it everywhere.
5. Proper nouns (game name in `<h1>`, sprite names like "Snake") may use `data-tr-mode="base"` to show base only and skip the `/ English` suffix.

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

- **Audio**: mute by default, unmute on first user gesture (browser autoplay rules). For now, generate sounds inline with `AudioContext` oscillators — no audio file dependencies. A `tone.js` chiptune helper is planned but not yet shipped.
- **2-player same-screen welcome**: pong-style, air-hockey, tug-of-war button-mash, drawing telephone are all great. The default is single-player *or* 2-player same-screen — both work for two siblings sharing one phone.

## Audience note

The repo is built with and for two kids (11 and 9). Default to forgiving mechanics, obvious on-screen controls, single-player or 2-player same-screen. When uncertain about scope, prefer the simpler classic version of a game over a feature-rich one. Variety matters — when picking what to build, lean toward genres the kids haven't tried yet (see the Genre cheatsheet above).
