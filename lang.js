/* lang.js — tiny shared language helper for playGround
 *
 * One simple model:
 *   • Top switcher: 🇷🇺 RU ⇄ 🇱🇻 LV  (base language)
 *   • English ALWAYS paired with the base   (the constant learning target)
 *   • Spanish sneaks in 1–3 places per game (delight, not chrome)
 *
 * Usage in HTML (static strings):
 *   <span data-ru="Старт" data-lv="Sākt" data-en="Start">Start</span>
 *   <button data-ru="Снова" data-lv="Vēlreiz" data-en="Again"
 *           data-tr-mode="pair">Again</button>      // default mode
 *   <h1 data-ru="Змейка" data-lv="Čūska" data-tr-mode="base">Snake</h1>
 *
 * Usage in JS (dynamic strings):
 *   titleEl.textContent = Lang.t('Конец игры', 'Spēles beigas', 'Game over');
 *   toast(Lang.pickEs('¡Excelente!', Lang.t('Победа!', 'Uzvara!', 'You win!')));
 *
 * Render the switcher once in your menu page:
 *   <div id="lang-switch"></div>
 *   <script>Lang.renderSwitcher(document.getElementById('lang-switch'));</script>
 */
(() => {
  const KEY = 'playground.base';
  const VALID = ['ru', 'lv'];
  let base = localStorage.getItem(KEY);
  if (!VALID.includes(base)) base = 'ru';

  // Spanish sneak-in vocabulary — emoji → ES word (used by Lang.esWord)
  const ES_WORDS = {
    '🐕': 'perro', '🐶': 'perrito', '🐈': 'gato', '🐱': 'gatito',
    '🐟': 'pez', '🐠': 'pez', '🐦': 'pájaro', '🐢': 'tortuga',
    '🦋': 'mariposa', '🌸': 'flor', '🌹': 'rosa', '🌞': 'sol',
    '🌙': 'luna', '⭐': 'estrella', '🌈': 'arcoíris', '☁️': 'nube',
    '🍎': 'manzana', '🍌': 'plátano', '🍓': 'fresa', '🍕': 'pizza',
    '⚽': 'fútbol', '🏀': 'baloncesto', '🎵': 'música', '🎮': 'juego',
    '🚀': 'cohete', '🚗': 'coche', '✈️': 'avión', '🏠': 'casa',
    '❤️': 'corazón', '😀': 'feliz', '😢': 'triste', '🏆': 'campeón',
    '🐍': 'serpiente', '🎉': 'fiesta', '👑': 'corona',
  };

  // Spanish phrase pools — used by esWin / esOops / esTagline
  const ES_WIN     = ['¡Excelente!', '¡Increíble!', '¡Genial!', '¡Bien hecho!', '¡Súper!', '¡Campeón!'];
  const ES_OOPS    = ['¡Ay!', '¡Casi!', '¡Otra vez!', '¡Inténtalo!', '¡Uy!'];
  const ES_TAGLINE = ['¡Juega y aprende!', '¡Vamos a jugar!', '¡Diviértete!', '¡A jugar!'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const Lang = {
    get base() { return base; },

    // Switch base language — persists and reloads the page.
    set(code) {
      if (!VALID.includes(code) || code === base) return;
      localStorage.setItem(KEY, code);
      location.reload();
    },

    // Pair: "<base> / <english>"  — the workhorse for visible strings.
    t(ru, lv, en) {
      return `${base === 'lv' ? lv : ru} / ${en}`;
    },

    // Base only (no English) — for proper nouns, very short labels, etc.
    tBase(ru, lv) { return base === 'lv' ? lv : ru; },

    // Just the English form — for cases where the base is shown elsewhere already.
    tEn(en) { return en; },

    // Spanish sneak-in: returns `es` ~`prob` of the time, else `fallback`.
    pickEs(es, fallback = '', prob = 0.25) {
      return Math.random() < prob ? es : fallback;
    },

    // Random Spanish phrases — convenience helpers for sneak-ins.
    esWin()     { return pick(ES_WIN); },
    esOops()    { return pick(ES_OOPS); },
    esTagline() { return pick(ES_TAGLINE); },

    // Spanish word for a common emoji (zero-cost passive vocab).
    esWord(emoji) { return ES_WORDS[emoji] || ''; },

    // Apply translations to elements with data-ru/data-lv attributes.
    // Default mode pairs base + English (data-en required).
    // data-tr-mode="base" renders base only (no English).
    applyDom(root) {
      root = root || document;
      root.querySelectorAll('[data-ru]').forEach(el => {
        const ru = el.getAttribute('data-ru');
        const lv = el.getAttribute('data-lv') || ru;
        const en = el.getAttribute('data-en');
        const mode = el.getAttribute('data-tr-mode') || 'pair';
        const baseStr = base === 'lv' ? lv : ru;
        if (mode === 'base' || !en) {
          el.textContent = baseStr;
        } else {
          el.textContent = `${baseStr} / ${en}`;
        }
      });
    },

    // Render the RU/LV switcher into a container element.
    renderSwitcher(el) {
      if (!el) return;
      el.classList.add('lang-switch');
      el.innerHTML =
        '<button class="lang-btn ' + (base === 'ru' ? 'active' : '') + '" data-l="ru" type="button" aria-label="Russian">🇷🇺 RU</button>' +
        '<button class="lang-btn ' + (base === 'lv' ? 'active' : '') + '" data-l="lv" type="button" aria-label="Latvian">🇱🇻 LV</button>';
      el.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => Lang.set(btn.getAttribute('data-l')));
      });
    },
  };

  window.Lang = Lang;

  // Auto-apply DOM translations on load.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Lang.applyDom());
  } else {
    Lang.applyDom();
  }
})();
