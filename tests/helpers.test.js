const { openPage, sources, root } = require('./browser.cjs');
const path = require('node:path');

let page;
afterEach(() => page?.close());

test('coverage includes every production script, even before a page is visited', () => {
  expect([...sources.keys()].filter(name => name.endsWith('.html'))).toHaveLength(12);
  for (const name of sources.keys()) expect(global.__coverage__[path.join(root, name)]).toBeDefined();
  expect(sources.has('test.js')).toBe(false);
});

test.each(['ru', 'lv'])('language helpers translate text and safely render %s UI', base => {
  page = openPage('lang.js', { 'playground.base': base });
  const { Lang } = page.window;
  expect(Lang.base).toBe(base);
  expect(Lang.t('Привет', 'Sveiki', 'Hello')).toBe('Hello · ' + (base === 'ru' ? 'Привет' : 'Sveiki'));
  expect(Lang.t('Hello', 'Hello', 'Hello')).toBe('Hello');
  expect(Lang.t('', '', 'Hello')).toBe('Hello');
  expect(Lang.tBase('ru', 'lv')).toBe(base);
  expect(Lang.tEn('Hello')).toBe('Hello');
  expect(Lang.pickEs('sí', 'yes', 1)).toBe('sí');
  expect(Lang.pickEs('sí', 'yes', 0)).toBe('yes');
  for (const method of ['esWin', 'esOops', 'esTagline']) expect(Lang[method]()).toMatch(/^¡/);
  expect(Lang.esWord('🐕')).toBe('perro');
  expect(Lang.esWord('unknown')).toBe('');
  page.document.body.innerHTML = `<span data-en="<Start>" data-ru="<Старт>" data-lv="<Sākt>"></span>
    <span data-en="English" data-tr-mode="en"></span>
    <span data-ru="ru" data-lv="lv" data-tr-mode="base"></span>
    <span data-en="Same" data-ru="Same" data-lv="Same"></span>
    <span data-ru="Fallback"></span><div id="switch"></div>`;
  Lang.applyDom();
  const translated = page.document.querySelector('span');
  expect(translated.textContent).toBe('<Start>' + (base === 'ru' ? '<Старт>' : '<Sākt>'));
  expect(translated.querySelector('start')).toBeNull();
  expect(translated.getAttribute('aria-label')).toBe('<Start>');
  expect(page.document.querySelector('[data-tr-mode=base]').textContent).toBe(base);
  Lang.renderSwitcher(null);
  Lang.renderSwitcher(page.document.querySelector('#switch'));
  expect(page.document.querySelector('[aria-pressed=true]').dataset.l).toBe(base);
  Lang.set('invalid');
  Lang.set(base);
  expect(page.window.localStorage.getItem('playground.base')).toBe(base);
});

test('daily missions rotate by date, persist completion and prune only dated keys', () => {
  page = openPage('daily.js');
  const { Daily, Date: RealDate, localStorage } = page.window;
  const selections = new Set();
  for (let day = 1; day <= 30; day++) {
    page.window.Date = class extends RealDate {
      constructor() { super(2026, 0, day); }
    };
    expect(Daily.day()).toBe('2026-01-' + String(day).padStart(2, '0'));
    const ids = Daily.picks().map(game => game.id);
    expect(new Set(ids).size).toBe(3);
    expect(Daily.picks().map(game => game.id)).toEqual(ids);
    selections.add(ids.join(','));
  }
  expect(selections.size).toBeGreaterThan(1);
  localStorage.setItem('daily.1999-01-01', '{}');
  localStorage.setItem('daily.keep-me', 'keep');
  const game = Daily.picks()[0].id;
  Daily.mark(game);
  Daily.mark('invalid');
  expect(Daily.completed()).toEqual({ [game]: true });
  expect(localStorage.getItem('daily.1999-01-01')).toBeNull();
  expect(localStorage.getItem('daily.keep-me')).toBe('keep');
  for (const value of ['invalid json', 'null', '{}', '{"games":null}']) {
    localStorage.setItem('daily.' + Daily.day(), value);
    expect(Daily.completed()).toEqual({});
  }
  page.document.body.innerHTML = '<div id="board"></div>';
  Daily.init(game);
  page.event(page.document.querySelector('#board'), 'pointerdown');
  expect(Daily.completed()[game]).toBe(true);
});

test('leaderboards reject invalid scores, sort and trim top five, and recover from bad storage', () => {
  page = openPage('leaderboard.js');
  const { Leaderboard: board, localStorage } = page.window;
  expect(board.renderHtml('snake')).toBe('');
  for (const score of [0, -1, NaN, Infinity, 'invalid']) expect(board.add('snake', score)).toBe(-1);
  for (const score of [10, 30, 20, 50, 40, 60]) board.add('snake', score);
  expect(board.get('snake')).toEqual([60, 50, 40, 30, 20]);
  expect(board.add('snake', 1)).toBe(-1);
  expect(board.renderHtml('snake')).toContain('🥇');
  expect(board.getAll().find(entry => entry.id === 'snake').scores[0]).toBe(60);
  localStorage.setItem('lb.snake', '[10, "20", null, -2, "bad"]');
  expect(board.get('snake')).toEqual([10, 20]);
  for (const value of ['{', '{}', 'null']) {
    localStorage.setItem('lb.snake', value);
    expect(board.get('snake')).toEqual([]);
  }
});

test('tutorial navigation, voice, dismissal and replay persist the seen flag', () => {
  page = openPage('tutorial.js');
  const { Tutorial } = page.window;
  Tutorial.init();
  Tutorial.init({ game: 'example', steps: [null, { en: 'Tap', ru: 'Тап', lv: 'Piesitiens' }, { en: 'Play' }] });
  expect(page.document.querySelector('.tut-backdrop.show')).not.toBeNull();
  const buttons = [...page.document.querySelectorAll('.tut-btn')];
  const [skip, voice, prev, next] = buttons;
  expect(prev.disabled).toBe(true);
  voice.click();
  next.click();
  expect(page.window.speechSynthesis.speak).toHaveBeenCalled();
  prev.click();
  expect(page.document.querySelector('.tut-text').textContent).toContain('Tap');
  next.click(); next.click();
  expect(Tutorial.seen('example')).toBe(true);
  expect(page.document.querySelector('.tut-backdrop.show')).toBeNull();
  page.click('.tut-help');
  page.event(page.document, 'keydown', { key: 'ArrowRight' });
  page.event(page.document, 'keydown', { key: 'ArrowLeft' });
  voice.click();
  skip.click();
  Tutorial.reset('example');
  expect(Tutorial.seen('example')).toBe(false);
  Tutorial.open();
  page.event(page.document, 'keydown', { key: 'Escape' });
  Tutorial.open();
  page.click('.tut-backdrop');
  expect(Tutorial.seen('example')).toBe(true);
});

test.each(['index.html', 'leaderboard.html', 'daily-challenges.html'])('%s renders navigation and saved progress', name => {
  page = openPage(name, { 'lb.snake': '[42]', 'lb.tetris': '[20]' });
  expect(page.document.querySelectorAll('a[href$=".html"]').length).toBeGreaterThan(0);
  if (name === 'index.html') expect(page.document.querySelector('.card-best').textContent).toContain('42');
  if (name === 'leaderboard.html') expect(page.document.querySelectorAll('.game-card')).toHaveLength(2);
  if (name === 'daily-challenges.html') expect(page.document.querySelectorAll('.challenge')).toHaveLength(3);
});

test('leaderboard page explains empty state', () => {
  page = openPage('leaderboard.html');
  expect(page.document.querySelector('.empty-state').textContent).toContain('No scores yet');
});

test('menu rotates taglines and daily page renders completed missions', () => {
  page = openPage('index.html');
  for (const [random, expected] of [[0.1, /^¡/], [0.3, /Tap a game/], [0.8, /Pick a game/]]) {
    page.window.Math.random.mockReturnValue(random);
    page.window.eval(sources.get('index.html'));
    expect(page.document.querySelector('#tagline').textContent).toMatch(expected);
  }
  page.close();
  page = openPage('daily-challenges.html');
  page.window.Daily.mark(page.window.Daily.picks()[0].id);
  page.window.eval(sources.get('daily-challenges.html'));
  expect(page.document.querySelectorAll('.challenge.done')).toHaveLength(1);
  expect(page.document.querySelector('#progress').textContent).toContain('1 / 3');
});

test('tutorial and score display remain usable without optional language and voice helpers', () => {
  page = openPage('tutorial.js');
  delete page.window.Lang;
  delete page.window.speechSynthesis;
  delete page.window.SpeechSynthesisUtterance;
  page.window.Tutorial.init({ game: 'fallback', steps: [{ en: 'Tap' }] });
  expect(page.document.querySelector('.tut-text').textContent).toBe('Tap');
  expect(page.document.querySelector('[aria-label="Voice instructions"]')).toBeNull();
  page.window.Tutorial.close();
  page.window.Leaderboard.add('snake', 10);
  expect(page.window.Leaderboard.renderHtml('snake')).toContain('Top 5');
});
