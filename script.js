(function(){
"use strict";

var W = 480, H = 480;

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
document.getElementById('app').insertBefore(canvas, document.getElementById('hud'));
var ctx = canvas.getContext('2d');

var imgCanvas = document.createElement('canvas');
imgCanvas.width = W; imgCanvas.height = H;
var imgCtx = imgCanvas.getContext('2d');

var maskCanvas = document.createElement('canvas');
maskCanvas.width = W; maskCanvas.height = H;
var maskCtx = maskCanvas.getContext('2d');

// ---- game state ----
var currentImageIdx = 0;
var roundNumber = 0; // 1-indexed once first round loads
var deck = []; // shuffled queue of image indices, refilled when empty
var lastShownIdx = -1;
var lives = 3;
var totalDistance = 0;
var pos = { x: W/2, y: H/2 };
var target = { x: W/2, y: H/2 };
var lastAngle = 0;
var trail = [];
var keys = {};
var guessOpen = false;
var gameOver = false;
var gameStarted = false;
var hasMoved = false;

var hud = document.getElementById('hud');
var overlay = document.getElementById('overlay');
var overlayText = document.getElementById('overlayText');
var guessBox = document.getElementById('guessBox');
var guessInput = document.getElementById('guessInput');
var startOverlay = document.getElementById('startOverlay');
var guessBtn = document.getElementById('guessBtn');

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
  for (var i = 0; i < 3; i++) hearts += (i < lives ? '♥' : '♡') + ' ';
  hud.textContent = hearts + '  moves: ' + moves() + '  round: ' + roundNumber;

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
    loadRound();
  } else {
    lives -= 1;
    if (lives <= 0) gameOver = true;
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

function startGame() {
  target.x = pos.x; target.y = pos.y;
  gameStarted = true;
  startOverlay.style.display = 'none';
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
    if (!gameStarted) { startGame(); return; }
    if (guessOpen) submitGuess(); else openGuess();
    return;
  }
  if (e.key === 'Escape' && guessOpen) { closeGuess(); return; }
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
document.getElementById('startBtn').addEventListener('click', startGame);

// ---- unicorn rendering ----
function drawUnicorn(p, angle) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -3);
  ctx.lineTo(22, -10);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawTrail() {
  for (var i = 1; i < trail.length; i++) {
    var a = trail[i - 1], b = trail[i];
    var hue = (b.dist * 0.6) % 360;
    var alpha = i / trail.length;
    ctx.strokeStyle = 'hsla(' + hue + ',90%,60%,' + (alpha * 0.9) + ')';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
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
  if (d > 0.05) {
    lastAngle = Math.atan2(dy, dx);
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
  drawUnicorn(pos, lastAngle);
  if (gameStarted && !hasMoved && !gameOver) drawMoveHint();
}

function loop(t) {
  var dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
  last = t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

loadRound();
requestAnimationFrame(loop);
})();
