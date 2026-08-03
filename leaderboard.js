/* leaderboard.js — per-game top-5 high scores for playGround
 *
 * Storage: localStorage key "lb.<game>" → JSON array (desc-sorted, max 5)
 *
 * API:
 *   Leaderboard.add(game, score)  → 1-based rank (1–5) or -1 if not in top 5
 *   Leaderboard.get(game)         → sorted array of up to 5 scores
 *   Leaderboard.getAll()          → array of {id, meta, scores} for all registered games
 *   Leaderboard.renderHtml(game)  → overlay HTML snippet ('' if no entries)
 *   Leaderboard.GAMES             → registered game metadata array
 */
(() => {
  const MAX = 5;
  const MEDALS = ['🥇', '🥈', '🥉', '4.', '5.'];

  var GAMES = [
    { id: 'snake',          en: 'Snake',          ru: 'Змейка',                 lv: 'Čūska',              href: 'snake.html' },
    { id: 'tetris',         en: 'Tetris',          ru: 'Тетрис',                 lv: 'Tetris',             href: 'tetris.html' },
    { id: 'breakout',       en: 'Breakout',        ru: 'Арканоид',               lv: 'Breakout',           href: 'breakout.html' },
    { id: 'footbag',        en: 'Footbag',         ru: 'Набивка',                lv: 'Futbags',            href: 'footbag.html' },
    { id: 'space-invaders', en: 'Space Invaders',  ru: 'Космические захватчики', lv: 'Kosmosa iebrucēji',  href: 'space-invaders.html' },
    { id: 'flappy-bird',    en: 'Flappy Bird',     ru: 'Летающая птичка',        lv: 'Lidojošais putniņš', href: 'flappy-bird.html' },
  ];

  function key(game) { return 'lb.' + game; }

  function get(game) {
    try {
      const raw = localStorage.getItem(key(game));
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data)
        ? data.map(Number).filter(function(n) { return isFinite(n) && n > 0; })
        : [];
    } catch (_) { return []; }
  }

  // Returns 1-based rank (1–5) if the score made the top 5, otherwise -1.
  function add(game, score) {
    score = Number(score);
    if (!isFinite(score) || score <= 0) return -1;
    var entries = get(game);
    entries.push(score);
    entries.sort(function(a, b) { return b - a; });
    var trimmed = entries.slice(0, MAX);
    try { localStorage.setItem(key(game), JSON.stringify(trimmed)); } catch (_) {}
    var rank = trimmed.indexOf(score) + 1;
    return (rank >= 1 && rank <= MAX) ? rank : -1;
  }

  // Returns an HTML string for the leaderboard (empty string if no entries yet).
  function renderHtml(game) {
    var entries = get(game);
    if (!entries.length) return '';
    var rows = entries.map(function(s, i) {
      return '<li class="lb-row">' + MEDALS[i] + ' <span class="lb-score">' + s + '</span></li>';
    }).join('');
    var title = (window.Lang && window.Lang.t)
      ? window.Lang.t('Топ 5', 'Top 5', 'Top 5')
      : 'Top 5';
    return '<p class="lb-title">' + title + '</p><ol class="lb-list">' + rows + '</ol>';
  }

  function injectStyle() {
    if (document.getElementById('lb-style')) return;
    var s = document.createElement('style');
    s.id = 'lb-style';
    s.textContent = [
      '.lb-title { margin: 4px 0 2px; font-size: 11px; text-transform: uppercase;',
      '  letter-spacing: 0.06em; opacity: 0.55; }',
      '.lb-list { list-style: none; margin: 0; padding: 0;',
      '  font-size: 13px; color: var(--muted, #94a3b8); }',
      '.lb-row { padding: 1px 0; }',
      '.lb-score { color: var(--text, #e5e7eb); font-variant-numeric: tabular-nums;',
      '  font-weight: 600; margin-left: 4px; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  if (document.head) {
    injectStyle();
  } else {
    document.addEventListener('DOMContentLoaded', injectStyle);
  }

  // Returns an array of {id, meta, scores} for every registered game.
  // Games with no scores are included (scores will be []).
  function getAll() {
    return GAMES.map(function(g) {
      return { id: g.id, meta: g, scores: get(g.id) };
    });
  }

  window.Leaderboard = { get: get, add: add, renderHtml: renderHtml, getAll: getAll, GAMES: GAMES };
})();
