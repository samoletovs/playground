/* daily.js — daily game missions for playGround */
(() => {
  const GAMES = [
    { id: 'snake', en: 'Snake', ru: 'Змейка', lv: 'Čūska', href: 'snake.html', icon: '🐍' },
    { id: 'tetris', en: 'Tetris', ru: 'Тетрис', lv: 'Tetris', href: 'tetris.html', icon: '🧱' },
    { id: 'breakout', en: 'Breakout', ru: 'Арканоид', lv: 'Breakout', href: 'breakout.html', icon: '🟠' },
    { id: 'table-tennis', en: 'Table Tennis', ru: 'Пинг-понг', lv: 'Galda teniss', href: 'table-tennis.html', icon: '🏓' },
    { id: 'footbag', en: 'Footbag', ru: 'Набивка', lv: 'Futbags', href: 'footbag.html', icon: '⚽' },
    { id: 'space-invaders', en: 'Space Invaders', ru: 'Космические захватчики', lv: 'Kosmosa iebrucēji', href: 'space-invaders.html', icon: '🚀' },
    { id: 'pixel-art', en: 'Pixel Art', ru: 'Пиксель-арт', lv: 'Pikseļu māksla', href: 'pixel-art.html', icon: '🎨' },
    { id: 'air-hockey', en: 'Air Hockey', ru: 'Аэрохоккей', lv: 'Gaisa hokejs', href: 'air-hockey.html', icon: '🏒' },
    { id: 'flappy-bird', en: 'Flappy Bird', ru: 'Летающая птичка', lv: 'Lidojošais putniņš', href: 'flappy-bird.html', icon: '🐦' },
  ];

  function day() {
    const now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }

  function key() {
    return 'daily.' + day();
  }

  // Deterministic 32-bit mix — same date always gives the same order,
  // and a one-day change gives a completely different one.
  function hash(seed, index) {
    let value = (seed + index * 0x9e3779b9) >>> 0;
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
    return (value ^ (value >>> 16)) >>> 0;
  }

  function picks() {
    let seed = 0;
    for (const char of day()) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    return GAMES.map((game, index) => ({
      game,
      order: hash(seed, index),
    })).sort((a, b) => a.order - b.order).slice(0, 3).map(entry => entry.game);
  }

  function completed() {
    try {
      const value = JSON.parse(localStorage.getItem(key()) || '{}');
      return value && value.games && typeof value.games === 'object' ? value.games : {};
    } catch (_) {
      return {};
    }
  }

  // Yesterday's missions are gone — drop their leftover keys so storage stays tidy.
  const DAY_KEY = /^daily\.\d{4}-\d{2}-\d{2}$/;

  function prune() {
    const today = key();
    const stale = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if (name && name !== today && DAY_KEY.test(name)) stale.push(name);
      }
      stale.forEach(name => localStorage.removeItem(name));
    } catch (_) {}
  }

  function mark(game) {
    if (!picks().some(item => item.id === game)) return;
    const games = completed();
    games[game] = true;
    try {
      localStorage.setItem(key(), JSON.stringify({ games }));
    } catch (_) {}
    prune();
  }

  function init(game) {
    const start = document.getElementById('startBtn');
    if (start) {
      start.addEventListener('click', () => mark(game), { once: true });
      return;
    }
    const board = document.getElementById('board');
    if (board) board.addEventListener('pointerdown', () => mark(game), { once: true });
  }

  window.Daily = { GAMES, day, picks, completed, mark, prune, init };
})();
