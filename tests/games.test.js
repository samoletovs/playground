const { openPage } = require('./browser.cjs');

let page;
afterEach(() => page?.close());

const games = ['air-hockey', 'breakout', 'flappy-bird', 'footbag', 'snake', 'space-invaders', 'table-tennis', 'tetris'];

test.each(games)('%s starts, animates, accepts controls and restarts', game => {
  page = openPage(game + '.html');
  page.window.Tutorial.close();
  const isTableTennis = game === 'table-tennis';
  if (isTableTennis) expect(page.document.querySelector('#overlay').style.display).not.toBe('none');
  else expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(true);
  page.click('#startBtn');
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(false);
  page.frame(10);
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', ' ', 'p', 'c', 'z', 'x']) {
    page.key(key, key === ' ' ? 'Space' : key);
    page.frame();
    page.event(page.window, 'keyup', { key, code: key });
  }
  const board = page.document.querySelector('#board') || page.document.querySelector('canvas');
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave']) {
    page.event(board, type, { clientX: 120, clientY: 300, pointerId: 1 });
  }
  page.event(page.window, 'resize');
  page.event(page.window, 'orientationchange');
  page.frame(180);
  expect(page.context.fillRect).toHaveBeenCalled();
  page.click('#startBtn');
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(false);
});

test('Flappy Bird scores once per pipe, flaps, collides, saves best and restarts', () => {
  page = openPage('flappy-bird.html');
  page.click('#startBtn');
  page.state('pipes = [{ x: birdX - 80, gapTop: 0, gapBottom: height(), passed: false }]; birdV = 0; pipeTimer = 10; step(0)');
  expect(page.document.querySelector('#score').textContent).toBe('1');
  page.state('step(0)');
  expect(page.document.querySelector('#score').textContent).toBe('1');
  page.key(' ', 'Space');
  expect(page.state('birdV')).toBe(-8.6);
  page.state('birdY = 0; step(0)');
  expect(page.state('alive')).toBe(false);
  expect(page.window.localStorage.getItem('flappy-bird.best')).toBe('1');
  expect(page.window.Leaderboard.get('flappy-bird')).toEqual([1]);
  page.click('#startBtn');
  expect(page.state('score')).toBe(0);
  page.state('pipes = [{x: birdX, gapTop: height(), gapBottom: height(), passed: false}]; step(0)');
  expect(page.state('alive')).toBe(false);
});

test('Pixel Art paints, erases, fills, changes brushes, clears and exports', () => {
  page = openPage('pixel-art.html');
  const board = page.document.querySelector('#board');
  const pointer = (type, x = 20, y = 20) => page.event(board, type, { clientX: x, clientY: y });
  pointer('pointerdown');
  pointer('pointermove', 60, 60);
  pointer('pointerup');
  expect(page.state('pixels[0][0]')).not.toBeNull();
  expect(page.window.localStorage.getItem('pixel-art.pixels')).not.toBeNull();
  page.key('e');
  pointer('pointerdown'); pointer('pointerup');
  expect(page.state('pixels[0][0]')).toBeNull();
  page.click('.swatch:nth-child(3)');
  page.key('f');
  pointer('pointerdown'); pointer('pointerup');
  expect(page.state('pixels[0][0]')).toBe(page.state('color'));
  page.click('[data-size="3"]');
  page.key('p');
  pointer('pointermove'); pointer('pointerleave');
  pointer('pointerdown', -10, -10);
  pointer('pointercancel');
  page.key('g');
  page.click('#btnSave');
  expect(page.window.HTMLCanvasElement.prototype.toDataURL()).toMatch(/^data:image/);
  page.click('#curColor');
  const picker = page.document.querySelector('input[type=color]');
  picker.value = '#123456';
  page.event(picker, 'input');
  page.event(picker, 'change');
  expect(page.state('color')).toBe('#123456');
  page.click('#btnClear');
  expect(page.state('pixels.flat().every(pixel => pixel === null)')).toBe(true);
});

test('Snake eats food, chains points, applies power-ups and dies on collisions', () => {
  page = openPage('snake.html');
  page.click('#startBtn');
  const eat = type => page.state(`foods = [{x: snake[0].x + 1, y: snake[0].y, type: '${type}'}]; step()`);
  const initialLength = page.state('snake.length');
  eat('apple');
  expect(page.state('score')).toBe(10);
  expect(page.state('snake.length')).toBe(initialLength + 1);
  eat('berry');
  expect(page.state('score')).toBe(60);
  eat('apple');
  expect(page.state('score')).toBe(75);
  eat('skull');
  expect(page.state('score')).toBe(55);
  for (const type of ['ghost', 'slow', 'double']) {
    page.state(`applyPowerup({type:'${type}', x:0, y:0})`);
  }
  page.state("placeFood('berry'); placeFood('skull'); placePowerup(); draw()");
  page.state('snake[0] = {x:19,y:10}; nextDir = {x:1,y:0}; step()');
  expect(page.state('snake[0].x')).toBe(0);
  expect(page.state('alive')).toBe(true);
  eat('apple');
  expect(page.state('score')).toBe(75);
  const board = page.document.querySelector('#board');
  for (const [x, y] of [[100, 160], [100, 20], [200, 20], [20, 20]]) {
    page.event(board, 'pointerdown', { clientX: 100, clientY: 100 });
    page.event(board, 'pointermove', { clientX: x, clientY: y });
    page.state('draw()');
  }
  page.state('ghostUntil = 0; snake[0] = {x:19,y:10}; nextDir = {x:1,y:0}; step()');
  expect(page.state('alive')).toBe(false);
  expect(page.window.localStorage.getItem('snake.best')).toBe('75');
  page.key('Enter');
  expect(page.state('alive')).toBe(true);
  page.state('snake = [{x:2,y:2},{x:3,y:2},{x:3,y:3}]; nextDir={x:1,y:0}; step()');
  expect(page.state('alive')).toBe(false);
});

test('Tetris rotates, holds, hard drops, clears lines, levels up and persists a loss', () => {
  page = openPage('tetris.html');
  page.click('#startBtn');
  const first = page.state('current.type');
  page.key('h');
  expect(page.state('holdType')).toBe(first);
  const held = page.state('current.type');
  page.key('h');
  expect(page.state('current.type')).toBe(held);
  page.state('canHold = true; holdPiece()');
  expect(page.state('current.type')).toBe(first);
  page.key('ArrowUp');
  expect(page.state('collides(current, 0, 0)')).toBe(false);
  page.key(' ');
  expect(page.state('score')).toBeGreaterThan(0);
  page.state('grid = newGrid(); lines = 9; combo = -1; grid[19].fill("#fff"); clearLines()');
  expect(page.state('lines')).toBe(10);
  expect(page.state('level')).toBe(2);
  for (let i = 0; i < 2; i++) page.state('grid = newGrid(); for(let y=16;y<20;y++) grid[y].fill("#fff"); clearLines(); draw()');
  expect(page.state('lines')).toBe(18);
  expect(page.document.querySelector('#toast').textContent).toMatch(/Tetris|TETRIS/);
  for (const button of page.document.querySelectorAll('#controls button')) {
    page.event(button, 'pointerdown');
    page.frame(1, 250);
    page.event(button, 'pointerup');
    page.event(button, 'pointerleave');
    page.event(button, 'pointercancel');
  }
  page.state('die()');
  expect(page.window.localStorage.getItem('tetris.best')).toBe(String(page.state('score')));
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(true);
});

test('Breakout scores brick hits, applies bonuses, changes levels and loses lives', () => {
  page = openPage('breakout.html');
  page.click('#startBtn');
  page.state('launchBall()');
  page.state('const b = bricks.find(b => b.alive); balls = [{x:b.x+b.w/2,y:b.y+b.h/2,vx:0,vy:-2,attached:false}]; step()');
  expect(page.state('score')).toBeGreaterThan(0);
  for (const type of ['wide', 'slow', 'multi', 'life']) page.state(`applyPowerup(POWER_TYPES.find(t=>t.id==='${type}'))`);
  expect(page.state('balls.length')).toBe(3);
  expect(page.state('lives')).toBe(4);
  expect(page.state('paddleW()')).toBeGreaterThan(page.state('PADDLE_BASE_W'));
  page.state('draw(); nextLevel()');
  expect(page.state('level')).toBe(2);
  for (let i = 0; i < 3; i++) page.state('nextLevel()');
  expect(page.state('level')).toBe(5);
  page.state('lives = 1; loseLife()');
  expect(page.state('alive')).toBe(false);
  expect(page.window.Leaderboard.get('breakout')[0]).toBe(page.state('score'));
});

test('Air Hockey scores both goals, pauses and ends single- and two-player matches', () => {
  page = openPage('air-hockey.html');
  page.click('#startBtn');
  page.state('puck.x = W / 2; puck.y = -10; puck.vx = 0; puck.vy = -2; stepOnce(1)');
  expect(page.document.querySelector('#s1').textContent).toBe('1');
  page.frame();
  page.state('puck.x = W / 2; puck.y = H + 10; puck.vx = 0; puck.vy = 2; stepOnce(1)');
  expect(page.document.querySelector('#s2').textContent).toBe('1');
  page.state('scores[0] = WIN - 1; goalScored(0)');
  expect(page.state('alive')).toBe(false);
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(true);
  page.click('#startBtn');
  page.state('scores[1] = WIN - 1; goalScored(1)');
  expect(page.state('alive')).toBe(false);
  page.state('aiMode = false; start(); scores[1] = WIN - 1; goalScored(1)');
  expect(page.state('alive')).toBe(false);
});

test('Air Hockey paddle impulses, walls, pause and both touch zones work', () => {
  page = openPage('air-hockey.html');
  page.click('#btn2p');
  page.click('#startBtn');
  const board = page.document.querySelector('#board');
  for (const [y, id] of [[100, 1], [500, 2]]) {
    page.event(board, 'pointerdown', { clientX: 100, clientY: y, pointerId: id });
    page.event(board, 'pointermove', { clientX: 200, clientY: y + 20, pointerId: id });
    page.event(board, 'pointerup', { pointerId: id });
  }
  for (const key of ['a', 'd', 'w', 's', 'ArrowUp', 'ArrowDown']) {
    page.key(key);
    page.frame();
    page.event(page.window, 'keyup', { key });
  }
  for (const [x, y, vx, vy] of [[0, 100, -2, 0], [400, 100, 2, 0], [20, 0, 0, -2], [20, 600, 0, 2]]) {
    page.state(`puck.x=${x}; puck.y=${y}; puck.vx=${vx}; puck.vy=${vy}; stepOnce(1)`);
  }
  page.state('puck.x=paddles[0].x+1; puck.y=paddles[0].y; puck.vx=-20; puck.vy=0; stepOnce(0)');
  expect(page.state('puck.vx')).toBeGreaterThan(0);
  page.key('Escape');
  expect(page.state('paused')).toBe(true);
  page.key('Escape');
  expect(page.state('paused')).toBe(false);
  page.event(page.window, 'blur');
  expect(page.state('paused')).toBe(true);
  page.click('#pauseBtn');
  page.click('#btn1p');
  page.state('puck.vy=-2; aiUpdateTimer=0; aiStep()');
  expect(page.state('aiMode')).toBe(true);
});

test.each(['ru', 'lv'])('Space Invaders auto-fire labels and scoring work with %s helpers', base => {
  page = openPage('space-invaders.html', { 'playground.base': base });
  page.click('#startBtn');
  for (const enabled of [true, false]) {
    page.click('#afBtn');
    const button = page.document.querySelector('#afBtn');
    expect(button.classList.contains('on')).toBe(enabled);
    expect(button.textContent).toContain(enabled ? 'Auto: ON' : 'Auto: OFF');
    expect(button.getAttribute('aria-label')).toBe(enabled ? '🔫 Auto: ON' : '🔫 Auto: OFF');
  }
  page.state('const a = aliens[0]; playerBullet={x:alienX(a),y:alienY(a)+H*0.020}; step(); draw()');
  expect(page.state('score')).toBeGreaterThan(0);
  expect(page.state('aliens[0].alive')).toBe(false);
  const score = page.state('score');
  page.state('ufo={x:W/2,y:H*0.055}; playerBullet={x:W/2,y:H*0.075}; step(); draw()');
  expect(page.state('score')).toBeGreaterThan(score);
  page.state('aliens=[]; step(); draw()');
  expect(page.state('phase')).toBe('waveclear');
  page.state('waveclearTimer=1; step()');
  expect(page.state('wave')).toBe(2);
  expect(page.state('liveAliens().length')).toBeGreaterThan(0);
  page.state('hitPlayer(); dyingTimer=1; step()');
  expect(page.state('phase')).toBe('playing');
  page.state('lives=1; hitPlayer(); dyingTimer=1; step()');
  expect(page.state('phase')).toBe('over');
  expect(page.window.Leaderboard.get('space-invaders')[0]).toBe(page.state('score'));
});

test('Footbag kicks score, a circle charges a trick, and three drops end the game', () => {
  page = openPage('footbag.html');
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(true);
  page.click('#startBtn');
  page.key('ArrowLeft');
  expect(page.state('score')).toBe(1);
  expect(page.state('ball.vy')).toBeLessThan(0);
  page.state('gestureDown=true; gestureCenter={x:ball.x,y:ball.y}');
  for (let i = 0; i <= 30; i++) page.state(`updateGesture(ball.x+50*Math.cos(${i}*Math.PI/15),ball.y+50*Math.sin(${i}*Math.PI/15))`);
  expect(page.state('atw')).toBe(true);
  page.state('draw()');
  page.key('ArrowRight');
  expect(page.state('atw')).toBe(false);
  expect(page.state('score')).toBeGreaterThan(15);
  expect(page.window.localStorage.getItem('footbag.best')).toBe(String(page.state('score')));
  page.state('draw(); dropBall(); dropBall(); dropBall()');
  expect(page.state('alive')).toBe(false);
  expect(page.document.querySelector('#overlay').classList.contains('show')).toBe(true);
  expect(page.window.Leaderboard.get('footbag')[0]).toBe(page.state('score'));
});

test('Table Tennis power-ups, touch controls, scoring, match end and rematch', () => {
  page = openPage('table-tennis.html');
  page.click('[data-level=hard]');
  page.click('[data-mode="2p"]');
  page.click('#startBtn');
  const canvas = page.document.querySelector('canvas');
  for (const type of ['mousemove', 'touchstart', 'touchmove']) {
    for (const x of [30, 350]) page.event(canvas, type, {
      clientX: x, clientY: 100, changedTouches: [{ clientX: x, clientY: 100 }],
    });
  }
  page.event(canvas, 'touchend', { touches: [] });
  for (const type of ['wider', 'slow', 'multi', 'fire']) page.state(`applyPowerup('${type}', 'left')`);
  page.state("applyPowerup('wider', 'right'); draw()");
  expect(page.state('balls.length')).toBe(3);
  expect(page.state('balls.every(b=>b.fire)')).toBe(true);
  page.state('balls = [{...spawnBall("right"),x:W+100,fire:true}]; update(0)');
  expect(page.document.querySelector('#scorePlayer').textContent).toBe('2');
  page.state('balls = [{...spawnBall("left"),x:-100}]; update(0)');
  expect(page.document.querySelector('#scoreAI').textContent).toBe('1');
  page.state('scoreL = WIN_SCORE; balls=[]; update(0)');
  expect(page.document.querySelector('#endOverlay').style.display).toBe('flex');
  page.click('#rematchBtn');
  expect(page.state('scoreL')).toBe(0);
  page.state('endGame("right")');
  page.click('[data-mode=ai]');
  page.click('#rematchBtn');
  page.state('endGame("left"); endGame("right")');
  expect(page.document.querySelector('#endTitle').textContent).toContain('AI wins');
});

test.each([...games, 'pixel-art'])('%s resizes safely for high-DPI and hidden play areas', game => {
  page = openPage(game + '.html');
  const canvas = page.document.querySelector('#game, #canvas');
  expect(canvas).not.toBeNull();
  page.window.devicePixelRatio = 2;
  page.event(page.window, 'resize');
  expect(canvas.width).toBeGreaterThan(0);
  expect(canvas.height).toBeGreaterThan(0);
  if (game !== 'table-tennis') {
    const board = page.document.querySelector('#board');
    expect(canvas.width).toBe(Math.floor(board.getBoundingClientRect().width * 2));
  }
  const previous = [canvas.width, canvas.height];
  const playArea = page.document.querySelector('.play-area');
  if (!playArea) {
    page.document.querySelector('#board').getBoundingClientRect = () => ({ width: 200, height: 300 });
    page.event(page.window, 'resize');
    expect([canvas.width, canvas.height]).toEqual([400, 600]);
    return;
  }
  playArea.getBoundingClientRect = () => ({ width: 0, height: 0 });
  page.event(page.window, 'resize');
  expect([canvas.width, canvas.height]).toEqual(previous);
});
