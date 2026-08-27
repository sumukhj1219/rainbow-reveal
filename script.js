(function(){
"use strict";

var W = 480, H = 480;

// ---- randomized tiled background (sits behind the canvas) ----
(function buildGrassBackground() {
  var TILE = 16, GRID = 12; // 12x12 cells -> 192x192 composite, randomized per cell
  var sources = [
    'public/grass-tile-1.png',
    'public/grass-tile-2.png',
    'public/grass-tile-3.png',
    'public/grass-tile-4.png'
  ];
  var tiles = [];
  var loaded = 0;
  sources.forEach(function (src, i) {
    var img = new Image();
    img.onload = function () {
      loaded++;
      if (loaded === sources.length) composite();
    };
    img.src = src;
    tiles[i] = img;
  });

  function composite() {
    var c = document.createElement('canvas');
    c.width = c.height = TILE * GRID;
    var cx = c.getContext('2d');
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        var tile = tiles[Math.floor(Math.random() * tiles.length)];
        cx.drawImage(tile, x * TILE, y * TILE);
      }
    }
    var size = TILE * GRID * 2; // 2x pixel scale to match the rest of the game's art
    try {
      document.body.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
      document.body.style.backgroundSize = size + 'px ' + size + 'px';
    } catch (e) {
      // opened as file:// - canvas readback is blocked (tainted canvas).
      // fall back to one plain repeating tile instead of leaving the page dark.
      var fallback = sources[Math.floor(Math.random() * sources.length)];
      document.body.style.backgroundImage = 'url(' + fallback + ')';
      document.body.style.backgroundSize = (TILE * 2) + 'px ' + (TILE * 2) + 'px';
    }
  }
})();

// ---- procedural hidden-image authoring helpers ----
function star(cx, cy, rOuter, rInner, points, color) {
  var d = [], i, ang, r, x, y;
  for (i = 0; i < points * 2; i++) {
    ang = -Math.PI / 2 + i * Math.PI / points;
    r = (i % 2 === 0) ? rOuter : rInner;
    x = cx + r * Math.cos(ang);
    y = cy + r * Math.sin(ang);
    d.push([i === 0 ? 'M' : 'L', x, y]);
  }
  d.push(['Z']);
  return { t: 'p', c: color, d: d };
}

var IMAGES = [
  {
    name: 'star',
    accepted: ['star', 'stars'],
    shapes: [ star(240, 240, 150, 62, 5, '#ffd23f') ]
  },
  {
    name: 'cloud',
    accepted: ['cloud', 'clouds'],
    shapes: [{
      t: 'c', c: '#dce8f7',
      d: [[170,260,55],[230,225,65],[300,225,60],[345,260,48],[255,290,75],[160,290,40]]
    }]
  },
  {
    name: 'rainbow',
    accepted: ['rainbow', 'rainbows'],
    shapes: [
      { t:'a', c:'#ff4d4d', cx:240, cy:430, r:220, a0:Math.PI, a1:2*Math.PI, w:26 },
      { t:'a', c:'#ff9f43', cx:240, cy:430, r:193, a0:Math.PI, a1:2*Math.PI, w:26 },
      { t:'a', c:'#ffe74c', cx:240, cy:430, r:166, a0:Math.PI, a1:2*Math.PI, w:26 },
      { t:'a', c:'#3ddc84', cx:240, cy:430, r:139, a0:Math.PI, a1:2*Math.PI, w:26 },
      { t:'a', c:'#4d94ff', cx:240, cy:430, r:112, a0:Math.PI, a1:2*Math.PI, w:26 },
      { t:'a', c:'#a04dff', cx:240, cy:430, r:85,  a0:Math.PI, a1:2*Math.PI, w:26 }
    ]
  },
  {
    name: 'horn',
    accepted: ['horn', 'horns', 'unicornhorn'],
    shapes: [{
      t: 'p', c: '#f4c95d',
      d: [
        ['M', 240, 60],
        ['C', 255, 150, 260, 300, 270, 420],
        ['L', 210, 420],
        ['C', 220, 300, 225, 150, 240, 60],
        ['Z']
      ]
    }]
  },
  {
    name: 'horseshoe',
    accepted: ['horseshoe', 'horseshoes', 'shoe'],
    shapes: [
      { t:'a', c:'#d8d8d8', cx:240, cy:260, r:120, a0:-0.785, a1:3.927, w:50 }
    ]
  }
];

function drawShape(ctx, s) {
  ctx.beginPath();
  if (s.t === 'p') {
    for (var i = 0; i < s.d.length; i++) {
      var cmd = s.d[i], op = cmd[0];
      if (op === 'M') ctx.moveTo(cmd[1], cmd[2]);
      else if (op === 'L') ctx.lineTo(cmd[1], cmd[2]);
      else if (op === 'C') ctx.bezierCurveTo(cmd[1],cmd[2],cmd[3],cmd[4],cmd[5],cmd[6]);
      else if (op === 'Q') ctx.quadraticCurveTo(cmd[1],cmd[2],cmd[3],cmd[4]);
      else if (op === 'Z') ctx.closePath();
    }
    ctx.fillStyle = s.c;
    ctx.fill();
  } else if (s.t === 'c') {
    ctx.fillStyle = s.c;
    for (var j = 0; j < s.d.length; j++) {
      var circ = s.d[j];
      ctx.moveTo(circ[0] + circ[2], circ[1]);
      ctx.arc(circ[0], circ[1], circ[2], 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (s.t === 'a') {
    ctx.strokeStyle = s.c;
    ctx.lineWidth = s.w;
    ctx.lineCap = 'round';
    ctx.arc(s.cx, s.cy, s.r, s.a0, s.a1);
    ctx.stroke();
  }
}

// ---- setup canvases ----
var canvas = document.createElement('canvas');
canvas.width = W; canvas.height = H;
document.getElementById('app').insertBefore(canvas, document.getElementById('hint'));
var ctx = canvas.getContext('2d');

var imgCanvas = document.createElement('canvas');
imgCanvas.width = W; imgCanvas.height = H;
var imgCtx = imgCanvas.getContext('2d');

var maskCanvas = document.createElement('canvas');
maskCanvas.width = W; maskCanvas.height = H;
var maskCtx = maskCanvas.getContext('2d');

var UNICORN_FRAME = 24;
var UNICORN_FRAMES = 4;
var UNICORN_FRAME_MS = 220;
var unicornSprite = new Image();
var unicornReady = false;
unicornSprite.onload = function () { unicornReady = true; };
unicornSprite.src = 'public/unicorn-sprite.png';

// ---- game state ----
var currentImageIdx = 0;
var roundNumber = 0; // 1-indexed once first round loads
var deck = []; // shuffled queue of image indices, refilled when empty
var lastShownIdx = -1;
var lives = 3;
var totalDistance = 0;
var pos = { x: W/2, y: H/2 };
var target = { x: W/2, y: H/2 };
var facing = 1;
var trail = [];
var keys = {};
var guessOpen = false;
var gameOver = false;
var gameStarted = false;
var hasMoved = false;

var hud = document.getElementById('hud');
var livesHud = document.getElementById('livesHud');
var overlay = document.getElementById('overlay');
var overlayText = document.getElementById('overlayText');
var guessBox = document.getElementById('guessBox');
var guessInput = document.getElementById('guessInput');
var startOverlay = document.getElementById('startOverlay');
var startDialogText = document.getElementById('startDialogText');
var startBtn = document.getElementById('startBtn');
var guessBtn = document.getElementById('guessBtn');
var toast = document.getElementById('toast');

var GOOD_MESSAGES = ['Awesome!', 'Great job!', 'Nailed it!', 'Brilliant!', "You've got it!"];
var BAD_MESSAGES = ['So close, keep going!', "Don't give up!", 'Almost had it!', 'Try again, you can do it!'];
var toastTimer = null;

function showToast(text, kind) {
  toast.textContent = text;
  toast.className = 'show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.className = ''; }, 1600);
}

// ---- sfx (procedural Web Audio, no audio files) ----
var audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    var AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function beep(freq, dur, type, peak) {
  var ctx = ensureAudio();
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
function playCorrect() {
  beep(523.25, 0.12, 'square', 0.15);
  setTimeout(function () { beep(783.99, 0.15, 'square', 0.15); }, 90);
}
function playWrong() {
  beep(196, 0.2, 'sawtooth', 0.15);
}
function playGameOver() {
  beep(196, 0.15, 'sawtooth', 0.15);
  setTimeout(function () { beep(130.81, 0.3, 'sawtooth', 0.15); }, 140);
}
function playClick() {
  beep(880, 0.05, 'square', 0.08);
}
function playNeigh() {
  var ctx = ensureAudio();
  var now = ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.linearRampToValueAtTime(720, now + 0.12);
  osc.frequency.linearRampToValueAtTime(520, now + 0.24);
  osc.frequency.linearRampToValueAtTime(660, now + 0.36);
  osc.frequency.linearRampToValueAtTime(420, now + 0.5);
  osc.frequency.linearRampToValueAtTime(180, now + 0.7);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain.gain.setValueAtTime(0.18, now + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.8);
}

var STORY_STEPS = [
  { text: 'Long ago, a great <b>darkness</b> fell over the land, swallowing every picture, color, and shape into black.', cta: 'Next' },
  { text: 'Out of the shadows came a lone <b>unicorn</b>, its mane burning with every color of the rainbow.', cta: 'Next' },
  { text: 'Now it wanders the dark canvas, trailing rainbow light behind it &mdash; unveiling the pictures the darkness swallowed, one at a time.', cta: 'Next' }
];
var TUTORIAL_STEPS = [
  { text: 'Use <b>WASD</b> or the <b>arrow keys</b> (touch-drag on mobile) to move your unicorn across the dark canvas &mdash; its glowing trail reveals a hidden picture underneath.', cta: 'Continue' },
  { text: 'Press <b>Enter</b> or tap the <b>?</b> button to guess what it is.', cta: 'Continue' },
  { text: 'You have <b>3 lives</b> &mdash; a wrong guess costs one. Guess right and a new picture loads. Fewer moves = better score.', cta: 'Start' }
];
var ALL_STEPS = STORY_STEPS.concat(TUTORIAL_STEPS);
var tutorialStep = 0;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function normalize(s) { return s.trim().toLowerCase().replace(/[^a-z]/g, ''); }
function moves() { return Math.floor(totalDistance / 10); }

function nextImageIndex() {
  if (deck.length === 0) {
    deck = IMAGES.map(function (_, i) { return i; });
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    if (deck.length > 1 && deck[0] === lastShownIdx) {
      var k = 1 + Math.floor(Math.random() * (deck.length - 1));
      var t = deck[0]; deck[0] = deck[k]; deck[k] = t;
    }
  }
  return deck.shift();
}

function loadRound() {
  currentImageIdx = nextImageIndex();
  lastShownIdx = currentImageIdx;
  roundNumber += 1;
  imgCtx.clearRect(0, 0, W, H);
  var shapes = IMAGES[currentImageIdx].shapes;
  for (var k = 0; k < shapes.length; k++) drawShape(imgCtx, shapes[k]);
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.fillStyle = '#000';
  maskCtx.fillRect(0, 0, W, H);
  trail = [];
  updateHUD();
}

function punchHole(x, y, radius) {
  radius = radius || 34;
  maskCtx.save();
  maskCtx.globalCompositeOperation = 'destination-out';
  var g = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  maskCtx.fillStyle = g;
  maskCtx.beginPath();
  maskCtx.arc(x, y, radius, 0, Math.PI * 2);
  maskCtx.fill();
  maskCtx.restore();
}

function updateHUD() {
  var hearts = '';
  for (var i = 0; i < 3; i++) {
    hearts += '<img src="public/life.png" class="life-icon' + (i < lives ? '' : ' lost') + '" alt="life">';
  }
  livesHud.innerHTML = hearts;
  hud.textContent = 'moves: ' + moves() + '  round: ' + roundNumber;

  if (gameOver) {
    overlay.style.display = 'flex';
    overlayText.textContent = 'Game Over — ' + (roundNumber - 1) +
      ' picture' + (roundNumber - 1 === 1 ? '' : 's') + ' revealed, ' + moves() + ' moves';
  } else {
    overlay.style.display = 'none';
  }
}

function openGuess() {
  if (gameOver || !gameStarted) return;
  guessBtn.classList.remove('pulse');
  guessOpen = true;
  guessBox.style.display = 'flex';
  guessInput.value = '';
  guessInput.focus();
}
function closeGuess() {
  guessOpen = false;
  guessBox.style.display = 'none';
  guessInput.blur();
}
function submitGuess() {
  var val = normalize(guessInput.value);
  var accepted = IMAGES[currentImageIdx].accepted;
  var ok = false;
  for (var i = 0; i < accepted.length; i++) if (normalize(accepted[i]) === val) ok = true;
  closeGuess();
  if (ok) {
    playCorrect();
    showToast(GOOD_MESSAGES[Math.floor(Math.random() * GOOD_MESSAGES.length)], 'good');
    loadRound();
  } else {
    lives -= 1;
    showToast(BAD_MESSAGES[Math.floor(Math.random() * BAD_MESSAGES.length)], 'bad');
    if (lives <= 0) { gameOver = true; playGameOver(); } else { playWrong(); }
    updateHUD();
  }
}

function restart() {
  lives = 3;
  totalDistance = 0;
  gameOver = false;
  roundNumber = 0;
  deck = [];
  lastShownIdx = -1;
  loadRound();
}

function showTutorialStep(i) {
  tutorialStep = i;
  var step = ALL_STEPS[i];
  startDialogText.innerHTML = step.text;
  startBtn.textContent = step.cta;
}

function advanceTutorial() {
  playClick();
  if (tutorialStep < ALL_STEPS.length - 1) {
    showTutorialStep(tutorialStep + 1);
  } else {
    startGame();
  }
}

function startGame() {
  target.x = pos.x; target.y = pos.y;
  gameStarted = true;
  startOverlay.style.display = 'none';
  playNeigh();
}

// ---- input ----
function canvasPoint(clientX, clientY) {
  var r = canvas.getBoundingClientRect();
  return {
    x: clamp((clientX - r.left) * (W / r.width), 0, W),
    y: clamp((clientY - r.top) * (H / r.height), 0, H)
  };
}
canvas.addEventListener('touchmove', function (e) {
  e.preventDefault();
  var t = e.touches[0];
  var p = canvasPoint(t.clientX, t.clientY);
  target.x = p.x; target.y = p.y;
}, { passive: false });
canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    if (!gameStarted) { advanceTutorial(); return; }
    if (guessOpen) submitGuess(); else openGuess();
    return;
  }
  if (e.key === 'Escape' && guessOpen) { closeGuess(); return; }
  if (e.key === 'Escape' && !gameStarted) { startGame(); return; }
  var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = true;
});
document.addEventListener('keyup', function (e) {
  var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = false;
});

guessBtn.addEventListener('click', function () {
  if (guessOpen) submitGuess(); else openGuess();
});
document.getElementById('restartBtn').addEventListener('click', restart);
startBtn.addEventListener('click', advanceTutorial);
document.getElementById('skipTutorial').addEventListener('click', function (e) {
  e.preventDefault();
  playClick();
  if (tutorialStep < STORY_STEPS.length) {
    showTutorialStep(STORY_STEPS.length);
  } else {
    startGame();
  }
});

// ---- unicorn rendering ----
function drawUnicorn(p) {
  if (!unicornReady) return;
  var f = Math.floor(Date.now() / UNICORN_FRAME_MS) % UNICORN_FRAMES;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(facing, 1);
  ctx.drawImage(unicornSprite, f * UNICORN_FRAME, 0, UNICORN_FRAME, UNICORN_FRAME,
    -UNICORN_FRAME / 2, -UNICORN_FRAME / 2, UNICORN_FRAME, UNICORN_FRAME);
  ctx.restore();
}

var TRAIL_COLORS = ['#ff4d4d', '#ff9f43', '#ffe74c', '#3ddc84', '#4d94ff', '#a04dff'];
var TRAIL_BAND_WIDTH = 3;

function drawTrail() {
  var bandSpan = TRAIL_BAND_WIDTH * (TRAIL_COLORS.length - 1);
  for (var i = 1; i < trail.length; i++) {
    var a = trail[i - 1], b = trail[i];
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var alpha = (i / trail.length) * 0.9;
    ctx.lineWidth = TRAIL_BAND_WIDTH + 1;
    ctx.lineCap = 'round';
    for (var band = 0; band < TRAIL_COLORS.length; band++) {
      var off = band * TRAIL_BAND_WIDTH - bandSpan / 2;
      ctx.strokeStyle = TRAIL_COLORS[band];
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(a.x + nx * off, a.y + ny * off);
      ctx.lineTo(b.x + nx * off, b.y + ny * off);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawMoveHint() {
  var pulse = (Date.now() % 1600) / 1600;
  var r = 18 + pulse * 22;
  var alpha = 1 - pulse;
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,' + (alpha * 0.6) + ')';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
  ctx.stroke();
  ctx.font = 'bold 13px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.strokeText('move me', pos.x, pos.y + 46);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.fillText('move me', pos.x, pos.y + 46);
  ctx.restore();
}

// ---- loop ----
var last = 0;
function update(dt) {
  if (!gameStarted || gameOver || guessOpen) return;

  var speed = 260; // px/sec for keyboard movement
  if (keys.ArrowLeft || keys.a) target.x -= speed * dt;
  if (keys.ArrowRight || keys.d) target.x += speed * dt;
  if (keys.ArrowUp || keys.w) target.y -= speed * dt;
  if (keys.ArrowDown || keys.s) target.y += speed * dt;
  target.x = clamp(target.x, 0, W);
  target.y = clamp(target.y, 0, H);

  var lag = 0.25;
  var px = pos.x, py = pos.y;
  pos.x += (target.x - pos.x) * lag;
  pos.y += (target.y - pos.y) * lag;

  var dx = pos.x - px, dy = pos.y - py;
  var d = Math.hypot(dx, dy);
  if (dx > 0.3) facing = 1;
  else if (dx < -0.3) facing = -1;
  if (d > 0.05) {
    totalDistance += d;
    punchHole(pos.x, pos.y);
    trail.push({ x: pos.x, y: pos.y, dist: totalDistance });
    if (trail.length > 50) trail.shift();
    if (!hasMoved) hasMoved = true;
    updateHUD();
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(imgCanvas, 0, 0);
  ctx.drawImage(maskCanvas, 0, 0);
  drawTrail();
  drawUnicorn(pos);
  if (gameStarted && !hasMoved && !gameOver) drawMoveHint();
}

function loop(t) {
  var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
  last = t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

showTutorialStep(0);
loadRound();
requestAnimationFrame(loop);
})();
