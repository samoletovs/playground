/* tutorial.js — shared first-run onboarding walkthrough for playGround
 *
 * Shows a short, tappable, step-by-step tutorial the first time a kid opens a
 * game: one big visual cue (emoji) per step plus a bilingual line of text
 * (English primary + RU/LV helper via lang.js). An optional 🔊 voice toggle
 * reads the English text aloud — off by default, so nothing ever plays without
 * a tap (browser autoplay rules + it must never surprise anyone).
 *
 * Storage:
 *   tutorial.<game>.seen → '1' once the tutorial was finished or skipped
 *   tutorial.voice       → '1' when voice instructions are enabled
 *
 * Usage (once per game, after lang.js):
 *   <script src="tutorial.js"></script>
 *   <script>
 *     Tutorial.init({
 *       game: 'snake',
 *       steps: [
 *         { icon: '👆', ru: 'Свайп — поворот', lv: 'Velc, lai grieztu', en: 'Swipe to steer' },
 *         { icon: '🍎', ru: 'Ешь яблоки', lv: 'Ēd ābolus', en: 'Eat the apples' },
 *       ],
 *     });
 *   </script>
 *
 * API:
 *   Tutorial.init(opts)   → register steps, inject the ? button, auto-open once
 *   Tutorial.open()       → open the tutorial (used by the ? button)
 *   Tutorial.close()      → close it and mark as seen
 *   Tutorial.seen(game)   → boolean, has this game's tutorial been completed?
 *   Tutorial.reset(game)  → forget it was seen (so it shows again)
 */
(() => {
  const SEEN_PREFIX = 'tutorial.';
  const VOICE_KEY = 'tutorial.voice';

  function storeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function storeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* ignore */ }
  }
  function storeDel(key) {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
  }

  function seenKey(game) { return SEEN_PREFIX + game + '.seen'; }

  // Renders "English" + a smaller muted helper, matching the lang.js pair style.
  // Uses textContent (never innerHTML) so step text can never inject markup.
  function setPair(el, ru, lv, en) {
    el.textContent = en || '';
    const helper = (window.Lang && window.Lang.tBase) ? window.Lang.tBase(ru || '', lv || ru || '') : '';
    if (!helper || helper === en) return;
    const span = document.createElement('span');
    span.className = 'lang-helper';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = helper;
    el.appendChild(span);
    el.setAttribute('aria-label', en || '');
  }

  function injectStyle() {
    if (document.getElementById('tut-style')) return;
    const s = document.createElement('style');
    s.id = 'tut-style';
    s.textContent = [
      '.tut-help {',
      '  background: var(--panel, #131a33); color: var(--muted, #94a3b8);',
      '  border: 1px solid rgba(148,163,184,0.3); border-radius: 999px;',
      '  width: 28px; height: 28px; line-height: 1; font-size: 14px; font-weight: 700;',
      '  cursor: pointer; padding: 0; flex: 0 0 auto;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '.tut-help:active { transform: translateY(1px); }',
      '.tut-help:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }',
      '.tut-backdrop {',
      '  position: fixed; inset: 0; z-index: 9999; display: none;',
      '  align-items: center; justify-content: center; padding: 16px;',
      '  background: rgba(4, 8, 22, 0.82);',
      '}',
      '.tut-backdrop.show { display: flex; }',
      '.tut-card {',
      '  background: var(--panel, #131a33); color: var(--text, #e5e7eb);',
      '  border: 1px solid var(--grid, #1b2347); border-radius: 18px;',
      '  padding: 20px 18px 16px; width: min(420px, 100%); text-align: center;',
      '  display: flex; flex-direction: column; gap: 12px;',
      '  box-shadow: 0 18px 50px rgba(0,0,0,0.45);',
      '}',
      '.tut-icon { font-size: 46px; line-height: 1; }',
      '.tut-text { font-size: 17px; font-weight: 600; margin: 0; min-height: 2.4em; }',
      '.tut-dots { display: flex; gap: 6px; justify-content: center; }',
      '.tut-dot { width: 7px; height: 7px; border-radius: 999px; background: rgba(148,163,184,0.35); }',
      '.tut-dot.on { background: #4ade80; }',
      '.tut-row { display: flex; gap: 8px; align-items: center; justify-content: space-between;',
      '  flex-wrap: wrap; }',
      '.tut-btn {',
      '  background: #4ade80; color: #05210f; border: 0; border-radius: 12px;',
      '  padding: 10px 14px; font-size: 15px; font-weight: 700; cursor: pointer;',
      '  min-width: 0;',
      '  -webkit-tap-highlight-color: transparent;',
      '}',
      '.tut-btn.ghost { background: transparent; color: var(--muted, #94a3b8); font-weight: 600; }',
      '.tut-btn:active { transform: translateY(1px); }',
      '.tut-btn:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }',
      '.tut-btn[disabled] { opacity: 0.35; cursor: default; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  let steps = [];
  let game = '';
  let index = 0;
  let backdrop = null;
  let iconEl, textEl, dotsEl, prevBtn, nextBtn, skipBtn, voiceBtn;

  function voiceOn() { return storeGet(VOICE_KEY) === '1'; }

  function canSpeak() {
    return typeof window.speechSynthesis !== 'undefined' &&
           typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  function stopSpeech() {
    if (canSpeak()) { try { window.speechSynthesis.cancel(); } catch (_) {} }
  }

  // Voice instructions read the English text only — the point is English practice.
  function speakCurrent() {
    if (!voiceOn() || !canSpeak() || !steps[index]) return;
    const text = String(steps[index].en || '').replace(/[^\p{L}\p{N}\s.,!?'-]/gu, ' ').trim();
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (_) { /* speech unavailable — visuals still work */ }
  }

  function syncVoiceBtn() {
    if (!voiceBtn) return;
    const on = voiceOn();
    voiceBtn.textContent = on ? '🔊' : '🔇';
    voiceBtn.setAttribute('aria-pressed', String(on));
  }

  function render() {
    if (!backdrop) return;
    const step = steps[index] || {};
    iconEl.textContent = step.icon || '🎮';
    setPair(textEl, step.ru, step.lv, step.en);
    dotsEl.innerHTML = '';
    steps.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'tut-dot' + (i === index ? ' on' : '');
      dotsEl.appendChild(d);
    });
    prevBtn.disabled = index === 0;
    const last = index === steps.length - 1;
    if (last) setPair(nextBtn, 'Играть', 'Spēlēt', 'Play');
    else setPair(nextBtn, 'Дальше', 'Tālāk', 'Next');
    setPair(skipBtn, 'Пропустить', 'Izlaist', 'Skip');
    setPair(prevBtn, 'Назад', 'Atpakaļ', 'Back');
  }

  function onKeydown(e) {
    if (!backdrop || !backdrop.classList.contains('show')) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowRight') { next(); }
    else if (e.key === 'ArrowLeft') { prev(); }
  }

  function build() {
    injectStyle();
    backdrop = document.createElement('div');
    backdrop.className = 'tut-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'How to play');

    const card = document.createElement('div');
    card.className = 'tut-card';

    iconEl = document.createElement('div');
    iconEl.className = 'tut-icon';
    iconEl.setAttribute('aria-hidden', 'true');

    textEl = document.createElement('p');
    textEl.className = 'tut-text';

    dotsEl = document.createElement('div');
    dotsEl.className = 'tut-dots';
    dotsEl.setAttribute('aria-hidden', 'true');

    const row = document.createElement('div');
    row.className = 'tut-row';

    skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'tut-btn ghost';

    voiceBtn = document.createElement('button');
    voiceBtn.type = 'button';
    voiceBtn.className = 'tut-btn ghost';
    voiceBtn.setAttribute('aria-label', 'Voice instructions');

    prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'tut-btn ghost';

    nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'tut-btn';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.gap = '4px';
    left.appendChild(skipBtn);
    if (canSpeak()) left.appendChild(voiceBtn);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '6px';
    right.appendChild(prevBtn);
    right.appendChild(nextBtn);

    row.appendChild(left);
    row.appendChild(right);

    card.appendChild(iconEl);
    card.appendChild(textEl);
    card.appendChild(dotsEl);
    card.appendChild(row);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    skipBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);
    voiceBtn.addEventListener('click', () => {
      const on = !voiceOn();
      storeSet(VOICE_KEY, on ? '1' : '0');
      syncVoiceBtn();
      if (on) speakCurrent(); else stopSpeech();
    });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKeydown);
    syncVoiceBtn();
  }

  function open() {
    if (!steps.length) return;
    if (!backdrop) build();
    index = 0;
    render();
    backdrop.classList.add('show');
    if (nextBtn) nextBtn.focus();
  }

  function close() {
    stopSpeech();
    if (backdrop) backdrop.classList.remove('show');
    if (game) storeSet(seenKey(game), '1');
  }

  function next() {
    if (index >= steps.length - 1) { close(); return; }
    index++;
    render();
    speakCurrent();
  }

  function prev() {
    if (index === 0) return;
    index--;
    render();
    speakCurrent();
  }

  // Adds the ? button to the game header so the tutorial can be replayed anytime.
  function addHelpButton() {
    if (document.querySelector('.tut-help')) return;
    const host = document.querySelector('.title-wrap') ||
                 document.querySelector('header') ||
                 document.querySelector('.topbar');
    if (!host) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tut-help';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'How to play');
    btn.addEventListener('click', open);
    host.appendChild(btn);
  }

  function init(opts) {
    opts = opts || {};
    game = String(opts.game || '');
    steps = Array.isArray(opts.steps) ? opts.steps.filter(Boolean) : [];
    if (!game || !steps.length) return;
    injectStyle();
    addHelpButton();
    // First visit only — never interrupt a returning player.
    if (storeGet(seenKey(game)) !== '1') open();
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  window.Tutorial = {
    init(opts) { ready(() => init(opts)); },
    open,
    close,
    seen(g) { return storeGet(seenKey(g)) === '1'; },
    reset(g) { storeDel(seenKey(g)); },
  };
})();
