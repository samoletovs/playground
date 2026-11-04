# playGround

## Overview
Single-file HTML mini-games for kids — no build step, pure browser arcade.

## Features
- Bilingual UI (RU/LV switcher)
- First-run onboarding tutorial in every game (replay anytime with the `?` button, optional 🔊 voice)
- Mobile-friendly touch controls
- Dark arcade aesthetic

## Testing
Use Node.js 22 or newer:

```sh
npm ci
npm test
```

Jest runs behavioral tests in `tests/` with jsdom. The suite exercises all nine
games (starting, controls, scoring, collisions, power-ups and game over), saved
scores, translations, tutorials, daily missions and menu pages.

Coverage includes every root production `.js` file and every HTML page's inline
JavaScript, including unvisited pages. The old browser-only `test.js` and test
infrastructure are not production code and are excluded. Inline scripts are
instrumented in the test harness; no game code is extracted or bundled.
`npm test` fails below 80% line coverage for any HTML page, or below 80% lines,
statements or functions for the shared scripts. Reports appear in the terminal
and in `coverage/index.html` (with LCOV in `coverage/lcov.info`).

For a focused run: `npm test -- --runTestsByPath tests/games.test.js`.
Coverage thresholds still apply, so a focused run may fail the coverage gate.
Canvas, audio, layout and animation timing are simulated; these tests do not
replace checking rendering and touch behavior in a real browser.

The site remains dependency-free at runtime: npm is only needed for development
tests, not to open games or deploy to GitHub Pages.