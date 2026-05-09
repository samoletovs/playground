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

## Audience note

The repo is built with and for a child. Default to single-player, forgiving mechanics, and obvious on-screen controls over keyboard-only schemes. When uncertain about scope, prefer the simpler classic version of a game over a feature-rich one.
