---
name: new-game
description: Scaffold a new single-file HTML game in this playground repo. Creates a `<slug>.html` from the shared template, wires it into the menu in `index.html`, and pushes directly to main so the kid can play it ~30s later. Use whenever the user wants to start a new game (e.g. "/new-game memory match", "scaffold a tic-tac-toe game", "let's add pong"). Do not invent gameplay during the scaffold — produce a runnable empty shell, then stop.
---

# new-game

Scaffold a new game in the playground repo. The output is a runnable but empty shell that follows every repo convention. Filling in gameplay is a separate step the user will request next.

**No PR step.** Push directly to `main` — the kid plays the game on their phone ~30 seconds later. There's no human review and no CI; the auto-merge workflow exists but isn't used by this skill anymore. Faster, simpler, fewer moving parts.

## Inputs

If the user has not already supplied them in the invocation, ask once before scaffolding:

1. **Slug** — kebab-case, used as the file name and `localStorage` key prefix (e.g. `memory-match`, `tic-tac-toe`).
2. **Title** — display title in **English** (e.g. "Memory Match").
3. **Title translations** — Russian and Latvian forms of the title (e.g. RU `"Найди пару"`, LV `"Atrodi pāri"`). Required because every game must work with the RU/LV switcher.
4. **Tagline** — one short line for the menu card in **English** (e.g. "Flip cards. Match the pairs.").
5. **Tagline translations** — Russian and Latvian forms of the tagline.
6. **Accent color** — pick one from this list, avoiding colors already used by other games on the menu:
   - green `#4ade80`
   - blue `#60a5fa`
   - amber `#f59e0b`
   - red `#f87171`
   - cyan `#22d3ee`
   - violet `#a78bfa`
   - lime `#84cc16`
   - pink `#f472b6`
7. **Icon letters** — 1–2 chars for the menu card icon (e.g. "MM" for Memory Match).
8. **Hint** — one line shown on the start overlay and under the board, in **English** (e.g. "Tap a card to flip it.").
9. **Hint translations** — Russian and Latvian forms of the hint.

If the user gives you enough to infer some of these, do — only ask about the truly missing pieces. For Russian and Latvian translations, you may produce them yourself if the user is fine with that — just confirm once.

## Steps

1. Make sure you're on `main` and up to date:
   ```
   git checkout main && git pull origin main
   ```
2. Read `.claude/skills/new-game/template.html` and write `<slug>.html` at the repo root, replacing every placeholder:
   - `{{TITLE_EN}}` → English display title
   - `{{TITLE_RU}}` → Russian display title
   - `{{TITLE_LV}}` → Latvian display title
   - `{{HINT_EN}}` → English hint
   - `{{HINT_RU}}` → Russian hint
   - `{{HINT_LV}}` → Latvian hint
   - `{{SLUG}}` → kebab-case slug
   - `{{ACCENT}}` → accent hex
   - `{{ACCENT_RGB}}` → the accent's `r, g, b` triple (e.g. `74, 222, 128` for `#4ade80`)
3. Edit `index.html`:
   - Add `.icon.<slug-as-css-class> { background: rgba({{ACCENT_RGB}}, 0.18); color: {{ACCENT}}; }` next to the existing `.icon.<name>` rules. Use the kebab slug as the CSS class.
   - Append a card inside the `.grid` container, matching the existing format. Note the `data-en/data-ru/data-lv` attributes — every menu card is English-primary with a small RU/LV helper next to it:
     ```html
     <a class="card" href="<slug>.html">
       <div class="icon <slug>">{{ICON_LETTERS}}</div>
       <h2 data-en="{{TITLE_EN}}" data-ru="{{TITLE_RU}}" data-lv="{{TITLE_LV}}">{{TITLE_EN}}</h2>
       <p data-en="{{TAGLINE_EN}}" data-ru="{{TAGLINE_RU}}" data-lv="{{TAGLINE_LV}}">{{TAGLINE_EN}}</p>
     </a>
     ```
4. Commit and push directly to `main`:
   ```
   git add <slug>.html index.html
   git commit -m "Add <Title> game"
   git push origin main
   ```
5. Tell the user the deployed URL: `https://playground.naurolabs.com/<slug>.html?v=<timestamp>` (the `?v=` cache-bust ensures the kid hits fresh content immediately). Mention the menu card too. GitHub Pages picks up the change in ~30 seconds.

## Stop here

After the push lands, **do not** start writing game logic. The shell is intentionally empty — it draws the panel background and shows the Play button, nothing more. Wait for the user to describe the gameplay (or to ask you to flesh it out). When they do, edit and push directly to `main` — no branches, no PRs.

## Conventions the template already encodes

Don't regress these when filling in gameplay later:

- Mobile viewport meta with `viewport-fit=cover, user-scalable=no` and a `theme-color`.
- `100dvh` layout, safe-area-inset padding, `overflow: hidden` on body, no tap highlight, no text selection.
- `.board-wrap` with `touch-action: none`.
- Canvas backing-store scaled by `devicePixelRatio` in `fitCanvas()`.
- A `← Menu` back link in the header (already bilingualized via `data-ru/data-lv`).
- Overlay-gated start: nothing runs until the user taps Play.
- Best score persisted to `localStorage` under `<slug>.best`.
- Both pointer and keyboard listeners stubbed.
- **`<script src="lang.js"></script>` is included.** Every visible string uses `data-ru/data-lv/data-en` or `Lang.t(ru, lv, en)`. See `CLAUDE.md → Language model` for full rules.

## When you fill in gameplay later

Once the user describes the game, when you go to add visible strings:

- Hardcoded HTML strings → `data-en/data-ru/data-lv` attributes on the element. English is the primary visible text; RU or LV (per the switcher) renders as a smaller muted helper next to it.
- Strings set in JS → `Lang.t('ru text', 'lv text', 'english text')` returns `"<English> · <helper>"`.
- Sneak Spanish into 1–3 places: a `Lang.esWin()` toast on a new high score, a `Lang.esWord('🐕')` flash when a sprite spawns, an occasional `Lang.esTagline()` in the hint area. Don't sprinkle Spanish on buttons, scores, or core UI — keep it as delight.
- Read CLAUDE.md's Language model section before adding text-heavy features.
