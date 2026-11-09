const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createInstrumenter } = require('istanbul-lib-instrument');

const root = path.resolve(__dirname, '..');
const sources = new Map();
global.__coverage__ = global.__coverage__ || {};

// Keep HTML line numbers intact, including pages that have multiple inline scripts.
for (const name of fs.readdirSync(root).filter(name => /\.(html|js)$/.test(name) && name !== 'test.js')) {
  const filename = path.join(root, name);
  const text = fs.readFileSync(filename, 'utf8');
  let source = text;
  if (name.endsWith('.html')) {
    const parsed = new JSDOM(text, { includeNodeLocations: true });
    let end = 0;
    source = '';
    for (const script of parsed.window.document.querySelectorAll('script:not([src])')) {
      const location = parsed.nodeLocation(script);
      const start = location.startTag.endOffset;
      source += '\n'.repeat(text.slice(end, start).split('\n').length - 1);
      source += text.slice(start, location.endTag.startOffset);
      end = location.endTag.startOffset;
    }
    parsed.window.close();
  }
  if (!source.trim()) continue;
  const instrumenter = createInstrumenter({ compact: false });
  const code = instrumenter.instrumentSync(source, filename);
  global.__coverage__[filename] = instrumenter.lastFileCoverage();
  sources.set(name, code);
}

function openPage(name, storage = {}) {
  const html = name.endsWith('.html') ? fs.readFileSync(path.join(root, name), 'utf8') : '<header></header>';
  const dom = new JSDOM(html, { url: 'https://playground.test/' + name, runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.__coverage__ = global.__coverage__;
  Object.entries(storage).forEach(([key, value]) => window.localStorage.setItem(key, value));
  let seed = 42;
  window.Math.random = jest.fn(() => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296));
  const frames = new Map();
  const timers = new Map();
  let id = 0;
  let now = 1000;
  window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.performance.now = () => now;
  window.setTimeout = jest.fn((callback, delay = 0) => {
    timers.set(++id, { callback, due: now + delay });
    return id;
  });
  window.clearTimeout = id => timers.delete(id);
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const width = parseFloat(this.style.width) || 400;
    const height = parseFloat(this.style.height) || 600;
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height };
  };
  window.HTMLElement.prototype.setPointerCapture = jest.fn();
  window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  window.ResizeObserver = class { observe() {} disconnect() {} };
  const gradient = { addColorStop: jest.fn() };
  const context = new Proxy({}, {
    get(target, key) {
      if (!(key in target)) target[key] = jest.fn(() => key === 'measureText' ? { width: 40 } : gradient);
      return target[key];
    },
  });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
  window.HTMLAnchorElement.prototype.click = jest.fn();
  const audioNode = () => ({
    connect: jest.fn(), start: jest.fn(), stop: jest.fn(),
    frequency: { value: 0 }, gain: { value: 0, setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
  });
  window.AudioContext = class {
    state = 'running';
    currentTime = 0;
    destination = {};
    createOscillator = audioNode;
    createGain = audioNode;
    resume = jest.fn(() => Promise.resolve());
  };
  window.speechSynthesis = { cancel: jest.fn(), speak: jest.fn() };
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };

  function load(file, expose = false) {
    let code = sources.get(file);
    if (!code) return;
    // Test-only access to the IIFE scope lets fixtures arrange exact collisions
    // without exporting internals or changing the shipped games.
    if (expose) {
      const end = code.lastIndexOf('})();');
      if (end !== -1) code = code.slice(0, end) + 'window.game = expression => eval(expression);\n' + code.slice(end);
    }
    if (expose && !code.includes('window.game =')) code += '\nwindow.game = expression => eval(expression);';
    window.eval(code);
  }
  if (name.endsWith('.html')) {
    for (const script of window.document.querySelectorAll('script[src]')) load(script.getAttribute('src'));
  } else {
    for (const file of ['lang.js', 'daily.js', 'leaderboard.js', 'tutorial.js']) load(file);
  }
  if (name.endsWith('.html')) load(name, true);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  Object.defineProperty(window.document, 'readyState', { value: 'complete', configurable: true });
  return {
    window, document: window.document, context,
    state: expression => window.game(expression),
    click(selector) { const el = window.document.querySelector(selector); expect(el).not.toBeNull(); el.click(); },
    event(target, type, properties = {}) {
      const event = new window.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, properties);
      target.dispatchEvent(event);
      return event;
    },
    key(key, code = key) {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }));
    },
    frame(count = 1, elapsed = 17) {
      for (let i = 0; i < count; i++) {
        now += elapsed;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach(callback => callback(now));
        for (const [id, timer] of [...timers]) {
          if (timer.due <= now) {
            timers.delete(id);
            timer.callback();
          }
        }
      }
    },
    close() { window.close(); },
  };
}

module.exports = { openPage, sources, root };
