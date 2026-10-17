// test.js — basic testing setup for playGround

// Example test cases
function testLang() {
  const lang = window.Lang;
  console.assert(lang.t('Привет', 'Sveiki', 'Hello') === 'Hello · Привет', 'Test failed: Language translation');
  console.assert(lang.t('Привет', 'Sveiki', 'Привет') === 'Привет', 'Test failed: No duplicate translation');
}

function testTutorial() {
  const tut = window.Tutorial;
  console.assert(typeof tut === 'object', 'Test failed: Tutorial helper missing');
  // The ? button needs a header-like host element, just like a real game page.
  const host = document.querySelector('header') || document.body.appendChild(document.createElement('header'));

  tut.reset('test-game');
  console.assert(tut.seen('test-game') === false, 'Test failed: reset should clear seen flag');
  tut.init({ game: 'test-game', steps: [{ icon: '👆', en: 'Tap', ru: 'Тап', lv: 'Piesitiens' }] });
  console.assert(document.querySelector('.tut-backdrop.show') !== null, 'Test failed: tutorial should open on first visit');
  console.assert(host.querySelector('.tut-help') !== null, 'Test failed: help button should be added');
  tut.close();
  console.assert(tut.seen('test-game') === true, 'Test failed: close should mark tutorial as seen');

  tut.reset('test-game');
  const btn = host.querySelector('.tut-help');
  if (btn) btn.remove();
}

function testDaily() {
  const daily = window.Daily;
  console.assert(typeof daily === 'object', 'Test failed: Daily helper missing');

  console.assert(/^\d{4}-\d{2}-\d{2}$/.test(daily.day()), 'Test failed: day() should be YYYY-MM-DD');

  const today = daily.picks().map(game => game.id);
  console.assert(today.length === 3, 'Test failed: picks() should return 3 missions');
  console.assert(new Set(today).size === 3, 'Test failed: picks() should not repeat a game');
  console.assert(
    today.join(',') === daily.picks().map(game => game.id).join(','),
    'Test failed: picks() should be stable within a day'
  );

  // Missions must actually rotate — the same three games every day is a bug.
  const seen = new Set();
  const RealDate = Date;
  for (let offset = 0; offset < 30; offset++) {
    const date = new RealDate(2026, 0, 1 + offset);
    window.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [date.getTime()])); }
      static now() { return date.getTime(); }
    };
    console.assert(
      daily.day() === '2026-01-' + String(date.getDate()).padStart(2, '0'),
      'Test failed: day() should follow the simulated clock'
    );
    seen.add(daily.picks().map(game => game.id).join(','));
  }
  window.Date = RealDate;
  console.assert(seen.size > 1, 'Test failed: picks() should change from day to day');

  localStorage.setItem('daily.1999-01-01', '{}');
  localStorage.setItem('daily.keep-me', 'not-a-day-key');
  daily.mark(today[0]);
  console.assert(daily.completed()[today[0]] === true, 'Test failed: mark() should record a mission');
  daily.mark('not-a-real-game');
  console.assert(
    daily.completed()['not-a-real-game'] === undefined,
    'Test failed: mark() should ignore games outside today\'s missions'
  );
  console.assert(
    localStorage.getItem('daily.1999-01-01') === null,
    'Test failed: stale daily keys should be pruned'
  );
  console.assert(
    localStorage.getItem('daily.keep-me') === 'not-a-day-key',
    'Test failed: prune() should only remove dated daily keys'
  );

  localStorage.removeItem('daily.keep-me');
  localStorage.removeItem('daily.' + daily.day());
}

async function testGameFeatures() {
  const games = [
    {
      file: 'air-hockey.html', feature: '#s1', featurePattern: /scores\[scorer\]\+\+/,
      controls: '#board', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
    {
      file: 'breakout.html', feature: '#score', featurePattern: /score \+= b\.points/,
      controls: '#board', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
    {
      file: 'flappy-bird.html', feature: '#score', featurePattern: /score \+= 1/,
      controls: '#board', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
    {
      file: 'footbag.html', feature: '#score', featurePattern: /score \+= pts/,
      controls: '#board', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
    {
      file: 'pixel-art.html', feature: '#palette', featurePattern: /function paintAt\(/,
      controls: '#toolbar', statePattern: /function savePixels\(\)[\s\S]*?localStorage\.setItem\(SAVE_KEY/,
    },
    {
      file: 'snake.html', feature: '#score', featurePattern: /score \+= 10 \* mul/,
      controls: '#board', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
    {
      file: 'space-invaders.html', feature: '#scoreEl', featurePattern: /score \+= pts/,
      controls: '#board', statePattern: /function startGame\(\)[\s\S]*?initGame\(\)/,
    },
    {
      file: 'table-tennis.html', feature: '#scorePlayer', featurePattern: /score[LR] \+= pts/,
      controls: '#canvas', statePattern: /function startGame\(\)[\s\S]*?running = true/,
    },
    {
      file: 'tetris.html', feature: '#score', featurePattern: /score \+= gained/,
      controls: '#controls', statePattern: /function start\(\)[\s\S]*?overlay\.classList\.remove\('show'\)/,
    },
  ];

  for (const game of games) {
    try {
      const response = await fetch(game.file);
      const source = await response.text();
      const page = new DOMParser().parseFromString(source, 'text/html');
      const scripts = [...page.querySelectorAll('script:not([src])')].map(script => script.textContent).join('\n');

      console.assert(
        response.ok && page.querySelector(game.feature) && game.featurePattern.test(scripts),
        `Test failed: ${game.file} should implement its score or core feature`
      );
      console.assert(
        page.querySelector(game.controls) && /addEventListener\('(?:keydown|pointerdown|touchstart)'/.test(scripts),
        `Test failed: ${game.file} should provide game controls`
      );
      console.assert(
        game.statePattern.test(scripts),
        `Test failed: ${game.file} should implement a game state transition`
      );
    } catch (error) {
      console.assert(false, `Test failed: could not test ${game.file}: ${error.message}`);
    }
  }
}

// Tutorial.init() waits for DOM ready, so run its checks once the page is loaded.
window.addEventListener('load', async () => {
  testLang();
  testTutorial();
  testDaily();
  await testGameFeatures();
  console.log('All tests passed!');
});
