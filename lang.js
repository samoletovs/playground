/* lang.js — tiny shared language helper for playGround
 *
 * Pedagogical model:
 *   • English is the main language (top learning priority)
 *   • RU/LV is shown as a smaller muted helper hint right after each English string
 *   • Top switcher 🇷🇺 RU ⇄ 🇱🇻 LV chooses which helper language is shown
 *   • Spanish sneaks in 1–3 places per game as cosmetic delight
 *
 * Visual format (auto-styled via injected CSS):
 *
 *      Start  старт          ← English big, RU helper smaller and muted
 *      Score  счёт   12      ← same pattern, value follows
 *
 * Usage in HTML (static strings) — pair mode is the default:
 *   <span data-en="Start" data-ru="Старт" data-lv="Sākt">Start</span>
 *   <button data-en="Again" data-ru="Снова" data-lv="Vēlreiz">Again</button>
 *
 * For elements where the helper would clutter (proper nouns, very short labels),
 * skip translation entirely (no data-* attributes) — the element just stays English.
 *   <h1>Snake</h1>
 *
 * Or force English-only via data-tr-mode="en":
 *   <h1 data-en="Snake" data-tr-mode="en">Snake</h1>
 *
 * Or force base-only via data-tr-mode="base" (rare):
 *   <a data-ru="Меню" data-lv="Izvēlne" data-tr-mode="base">Menu</a>
 *
 * Usage in JS (dynamic strings):
 *   titleEl.textContent = Lang.t('Конец игры', 'Spēles beigas', 'Game over');
 *   // → "Game over · Конец игры"  (or LV variant in LV mode)
 *
 *   toast(Lang.pickEs('¡Excelente!', Lang.t('Победа!', 'Uzvara!', 'You win!')));
 *   toast(Lang.esWin());                 // always Spanish: random win phrase
 *   toast(Lang.esWord('🐕'));            // 'perro'
 *
 * Render the switcher once on the menu page:
 *   <div id="lang-switch"></div>
 *   <script>Lang.renderSwitcher(document.getElementById('lang-switch'));</script>
 */
(() => {
  const KEY = 'playground.base';
  const VALID = ['ru', 'lv'];
  // Defensive: localStorage can throw in iOS Safari Private Mode or when storage
  // is disabled. Fall back to 'ru' (the default) so window.Lang still registers
  // and games keep working.
  let base = 'ru';
  try {
    const stored = localStorage.getItem(KEY);
    if (VALID.includes(stored)) base = stored;
  } catch (_) { /* localStorage unavailable; stay on default */ }

  // Spanish sneak-in vocabulary — emoji → ES word
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

  const ES_WIN     = ['¡Excelente!', '¡Increíble!', '¡Genial!', '¡Bien hecho!', '¡Súper!', '¡Campeón!'];
  const ES_OOPS    = ['¡Ay!', '¡Casi!', '¡Otra vez!', '¡Inténtalo!', '¡Uy!'];
  const ES_TAGLINE = ['¡Juega y aprende!', '¡Vamos a jugar!', '¡Diviértete!', '¡A jugar!'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Inject helper CSS once. Includes both the muted helper span style and the
  // language switcher button styles so consumers don't need to duplicate them.
  function injectStyle() {
    if (document.getElementById('lang-helper-style')) return;
    const style = document.createElement('style');
    style.id = 'lang-helper-style';
    style.textContent = `
      .lang-helper {
        font-size: 0.78em;
        opacity: 0.55;
        font-weight: 400;
        margin-left: 0.4em;
        white-space: nowrap;
      }
      .lang-switch { display: flex; gap: 6px; justify-content: flex-end; margin-bottom: 12px; }
      .lang-btn {
        background: #131a33;
        color: #94a3b8;
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }
      .lang-btn.active {
        color: #4ade80;
        border-color: rgba(74, 222, 128, 0.4);
        background: rgba(74, 222, 128, 0.08);
      }
      .lang-btn:active { transform: translateY(1px); }
    `;
    document.head.appendChild(style);
  }

  const Lang = {
    get base() { return base; },

    set(code) {
      if (!VALID.includes(code) || code === base) return;
      try { localStorage.setItem(KEY, code); } catch (_) { /* ignore */ }
      location.reload();
    },

    // Plain-text pair: "<English> · <helper>" — for JS-set strings.
    // If the helper is identical to the English (e.g. "Tetris" = "Tetris"), the
    // helper is dropped to avoid redundant duplication.
    t(ru, lv, en) {
      const helper = base === 'lv' ? lv : ru;
      return helper && helper !== en ? `${en} · ${helper}` : en;
    },

    tBase(ru, lv) { return base === 'lv' ? lv : ru; },
    tEn(en) { return en; },

    pickEs(es, fallback = '', prob = 0.25) {
      return Math.random() < prob ? es : fallback;
    },
    esWin()     { return pick(ES_WIN); },
    esOops()    { return pick(ES_OOPS); },
    esTagline() { return pick(ES_TAGLINE); },
    esWord(emoji) { return ES_WORDS[emoji] || ''; },

    // Apply translations to elements with data-en / data-ru / data-lv attributes.
    // Modes:
    //   default ("pair") — `<English><span class="lang-helper">helper</span>`
    //   "en"             — English only
    //   "base"           — helper only (no English shown)
    applyDom(root) {
      root = root || document;
      root.querySelectorAll('[data-en], [data-ru], [data-lv]').forEach(el => {
        const ru = el.getAttribute('data-ru');
        const lv = el.getAttribute('data-lv') || ru;
        const en = el.getAttribute('data-en');
        const mode = el.getAttribute('data-tr-mode') || 'pair';
        const helper = base === 'lv' ? lv : ru;

        if (mode === 'en') {
          if (en) el.textContent = en;
          return;
        }
        if (mode === 'base') {
          if (helper) el.textContent = helper;
          return;
        }
        if (en && helper && helper !== en) {
          el.innerHTML = `${escapeHtml(en)}<span class="lang-helper">${escapeHtml(helper)}</span>`;
        } else if (en) {
          el.textContent = en;
        } else if (helper) {
          el.textContent = helper;
        }
      });
    },

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

  if (document.head) {
    injectStyle();
  } else {
    document.addEventListener('readystatechange', () => {
      if (document.head && !document.getElementById('lang-helper-style')) injectStyle();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Lang.applyDom());
  } else {
    Lang.applyDom();
  }
})();
