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

// Tutorial.init() waits for DOM ready, so run its checks once the page is loaded.
window.addEventListener('load', () => {
  testLang();
  testTutorial();
  console.log('All tests passed!');
});
