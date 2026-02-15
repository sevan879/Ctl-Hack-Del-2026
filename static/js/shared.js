window.alert = function () {};

/* ═══════════════════════════════════════
   Gaze Smoother
   ═══════════════════════════════════════ */
class GazeSmoother {
  constructor() {
    this.smoothX = null;
    this.smoothY = null;
    this.lastRawX = 0;
    this.lastRawY = 0;
    this.lastTime = Date.now();
    this.history = [];
    this.HISTORY_SIZE = 15;
  }

  update(rawX, rawY) {
    var now = Date.now();
    var dt = Math.max(now - this.lastTime, 1);
    var vx = Math.abs(rawX - this.lastRawX) / dt;
    var vy = Math.abs(rawY - this.lastRawY) / dt;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var alpha = Math.min(0.6, Math.max(0.1, speed * 2));

    if (this.smoothX === null) {
      this.smoothX = rawX;
      this.smoothY = rawY;
    } else {
      this.smoothX = alpha * rawX + (1 - alpha) * this.smoothX;
      this.smoothY = alpha * rawY + (1 - alpha) * this.smoothY;
    }

    this.history.push({ x: rawX, y: rawY });
    if (this.history.length > this.HISTORY_SIZE) this.history.shift();

    if (this.history.length >= 5) {
      var medX = this.median(this.history.map(function (p) { return p.x; }));
      var medY = this.median(this.history.map(function (p) { return p.y; }));
      if (Math.sqrt((rawX - medX) * (rawX - medX) + (rawY - medY) * (rawY - medY)) > 200) {
        this.lastTime = now;
        this.lastRawX = rawX;
        this.lastRawY = rawY;
        return { x: this.smoothX, y: this.smoothY };
      }
    }

    this.lastRawX = rawX;
    this.lastRawY = rawY;
    this.lastTime = now;
    return { x: this.smoothX, y: this.smoothY };
  }

  median(arr) {
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
}

/* ═══════════════════════════════════════
   Dwell Button
   ═══════════════════════════════════════ */
class DwellButton {
  constructor(el, dwellTime, onActivate) {
    this.el = el;
    this.dwellTime = dwellTime || 2000;
    this.onActivate = onActivate;
    this.isGazing = false;
    this.startTime = 0;
    this.activated = false;

    if (!this.el.querySelector('.dwell-bar')) {
      var bar = document.createElement('div');
      bar.className = 'dwell-bar';
      bar.innerHTML = '<div class="dwell-fill"></div>';
      this.el.appendChild(bar);
    }
    this.fill = this.el.querySelector('.dwell-fill');
  }

  update(gx, gy) {
    if (this.activated) return;
    var r = this.el.getBoundingClientRect();
    var pad = 60;
    var inside =
      gx >= r.left - pad && gx <= r.right + pad &&
      gy >= r.top - pad && gy <= r.bottom + pad;

    if (inside) {
      if (!this.isGazing) {
        this.isGazing = true;
        this.startTime = Date.now();
        this.el.classList.add('gazing');
      }
      var pct = Math.min(((Date.now() - this.startTime) / this.dwellTime) * 100, 100);
      if (this.fill) this.fill.style.width = pct + '%';
      if (Date.now() - this.startTime >= this.dwellTime) {
        this.activated = true;
        if (this.fill) this.fill.style.width = '100%';
        if (this.onActivate) this.onActivate();
      }
    } else {
      this.isGazing = false;
      this.startTime = 0;
      if (this.fill) this.fill.style.width = '0%';
      this.el.classList.remove('gazing');
    }
  }

  reset() {
    this.activated = false;
    this.isGazing = false;
    this.startTime = 0;
    if (this.fill) this.fill.style.width = '0%';
    this.el.classList.remove('gazing');
  }
}

/* ═══════════════════════════════════════
   Calibration System
   ═══════════════════════════════════════ */
class CalibrationSystem {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.isRunning = false;
    this.pointPositions = [
      { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
      { x: 10, y: 35 }, { x: 50, y: 35 }, { x: 90, y: 35 },
      { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
      { x: 10, y: 65 }, { x: 50, y: 65 }, { x: 90, y: 65 },
      { x: 10, y: 85 }, { x: 50, y: 85 }, { x: 90, y: 85 },
    ];
    this.currentPointIndex = 0;
    this.currentRound = 0;
    this.totalRounds = 3;
    this.dotSizes = [80, 55, 35];
    this.dwellPerPoint = 2000;
    this.samplesPerPoint = 8;
  }

  createUI() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'cal-overlay';
    this.overlay.innerHTML =
      '<div id="cal-instruction">' +
        '<h2 id="cal-title">Round 1 of 3</h2>' +
        '<p id="cal-subtitle">Look at the dot and hold your gaze steady</p>' +
      '</div>' +
      '<div id="cal-dot-container">' +
        '<div id="cal-ring"></div>' +
        '<div id="cal-dot"></div>' +
      '</div>' +
      '<div id="cal-progress-container">' +
        '<div id="cal-progress-bar"></div>' +
      '</div>' +
      '<p id="cal-counter">Point 1 / ' + this.pointPositions.length + '</p>' +
      '<button id="cal-skip-btn">Skip Calibration</button>';
    document.body.appendChild(this.overlay);

    this.dot = document.getElementById('cal-dot');
    this.ring = document.getElementById('cal-ring');
    this.label = document.getElementById('cal-title');
    this.subtitle = document.getElementById('cal-subtitle');
    this.counter = document.getElementById('cal-counter');
    this.progressBar = document.getElementById('cal-progress-bar');

    var self = this;
    document.getElementById('cal-skip-btn').addEventListener('click', function () {
      self.skip();
    });
  }

  start() {
    this.createUI();
    this.isRunning = true;
    this.currentRound = 0;
    this.currentPointIndex = 0;
    this.label.textContent = 'Get Ready';
    this.subtitle.textContent = 'Position your face in the webcam and look at the screen';
    this.dot.style.display = 'none';
    this.ring.style.display = 'none';
    var self = this;
    setTimeout(function () { self.startRound(); }, 2000);
  }

  startRound() {
    this.shuffledPoints = this.shuffleArray(this.pointPositions.slice());
    this.currentPointIndex = 0;
    this.label.textContent = 'Round ' + (this.currentRound + 1) + ' of ' + this.totalRounds;
    this.subtitle.textContent = 'Dot size: ' + this.dotSizes[this.currentRound] + 'px — Look at each dot';
    var total = this.totalRounds * this.pointPositions.length;
    var done = this.currentRound * this.pointPositions.length;
    this.progressBar.style.width = ((done / total) * 100) + '%';
    this.dot.style.display = 'block';
    this.ring.style.display = 'block';
    this.showPoint();
  }

  showPoint() {
    var self = this;

    if (this.currentPointIndex >= this.shuffledPoints.length) {
      this.currentRound++;
      if (this.currentRound >= this.totalRounds) {
        this.complete();
        return;
      }
      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
      this.label.textContent = 'Round ' + this.currentRound + ' Complete!';
      this.subtitle.textContent = 'Next round: smaller dots for precision';
      setTimeout(function () { self.startRound(); }, 1500);
      return;
    }

    var pos = this.shuffledPoints[this.currentPointIndex];
    var size = this.dotSizes[this.currentRound];
    var sx = (pos.x / 100) * window.innerWidth;
    var sy = (pos.y / 100) * window.innerHeight;

    this.dot.style.width = size + 'px';
    this.dot.style.height = size + 'px';
    this.dot.style.left = sx + 'px';
    this.dot.style.top = sy + 'px';

    var rs = size + 20;
    this.ring.style.width = rs + 'px';
    this.ring.style.height = rs + 'px';
    this.ring.style.left = sx + 'px';
    this.ring.style.top = sy + 'px';
    this.ring.style.animation = 'none';
    this.ring.offsetHeight;
    this.ring.style.animation = 'ring-fill ' + this.dwellPerPoint + 'ms linear forwards';

    this.counter.textContent = 'Point ' + (this.currentPointIndex + 1) + ' / ' + this.shuffledPoints.length;
    var total = this.totalRounds * this.pointPositions.length;
    var done = this.currentRound * this.pointPositions.length + this.currentPointIndex;
    this.progressBar.style.width = ((done / total) * 100) + '%';

    var interval = this.dwellPerPoint / this.samplesPerPoint;
    var count = 0;
    var sampler = setInterval(function () {
      if (count >= self.samplesPerPoint) { clearInterval(sampler); return; }
      self.recordPoint(sx, sy);
      count++;
    }, interval);

    setTimeout(function () {
      clearInterval(sampler);
      self.currentPointIndex++;
      self.showPoint();
    }, this.dwellPerPoint);
  }

  recordPoint(x, y) {
    try {
      document.dispatchEvent(new MouseEvent('click', {
        clientX: x, clientY: y, bubbles: true, cancelable: true, view: window,
      }));
    } catch (e) { /* ignore */ }
  }

  complete() {
    this.isRunning = false;
    this.progressBar.style.width = '100%';
    this.label.textContent = '✅ Calibration Complete!';
    this.subtitle.textContent = 'You can now use eye tracking';
    this.dot.style.display = 'none';
    this.ring.style.display = 'none';
    this.counter.textContent = '';
    sessionStorage.setItem('eyeq_calibrated', 'true');
    var self = this;
    setTimeout(function () {
      self.overlay.remove();
      if (self.onComplete) self.onComplete();
    }, 1500);
  }

  skip() {
    this.isRunning = false;
    this.overlay.remove();
    sessionStorage.setItem('eyeq_calibrated', 'true');
    if (this.onComplete) this.onComplete();
  }

  shuffleArray(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = a[i]; a[i] = a[j]; a[j] = temp;
    }
    return a;
  }
}

/* ═══════════════════════════════════════
   Global Gaze State
   ═══════════════════════════════════════ */
var _sharedSmoother = new GazeSmoother();
var _gazeCallbacks = [];
var _isCalibrated = sessionStorage.getItem('eyeq_calibrated') === 'true';
var _webgazerBooted = false;

function onGaze(callback) {
  _gazeCallbacks.push(callback);
}

function snapToTargetGlobal(x, y) {
  var selectors = [
    '.mode-card', '.set-card', '.create-card', '.option',
    '.action-btn', '.delete-card-btn', '.modal-btn', '.modal-close',
    '.empty-cta', '.home-button', '.calibrate-btn',
    '#start-btn', '#next-btn', '#restart-btn',
    '.gaze-input', '.gaze-textarea', '.field-group textarea', '#topic-input'
  ];
  var targets = document.querySelectorAll(selectors.join(', '));
  var closest = null;
  var closestDist = 150;

  targets.forEach(function (t) {
    var r = t.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (d < closestDist) {
      closestDist = d;
      closest = { x: cx, y: cy };
    }
  });
  return closest || { x: x, y: y };
}

function bootWebGazer() {
  if (_webgazerBooted) {
    console.log('[shared] Already booted');
    return;
  }
  _webgazerBooted = true;

  if (typeof webgazer === 'undefined') {
    console.error('[shared] webgazer is undefined! Check script loading.');
    return;
  }

  console.log('[shared] Starting WebGazer...');

  var gazeDot = document.getElementById('gaze-dot');

  try {
    webgazer.setRegression('ridge');
    webgazer.showVideoPreview(true);
    webgazer.showPredictionPoints(false);

    webgazer.setGazeListener(function (data) {
      if (!data) return;

      var pt = _sharedSmoother.update(data.x, data.y);
      pt = snapToTargetGlobal(pt.x, pt.y);

      if (gazeDot) {
        gazeDot.style.display = 'block';
        gazeDot.style.left = pt.x + 'px';
        gazeDot.style.top = pt.y + 'px';
      }

      if (_isCalibrated) {
        for (var i = 0; i < _gazeCallbacks.length; i++) {
          try { _gazeCallbacks[i](pt.x, pt.y); }
          catch (err) { console.error('[shared] callback error:', err); }
        }
      }
    });

    webgazer.begin()
      .then(function () {
        console.log('[shared] WebGazer running ✓');

        setTimeout(function () {
          var vid = document.getElementById('webgazerVideoFeed');
          var canvas = document.getElementById('webgazerVideoCanvas');
          var css =
            'position:fixed!important;bottom:10px!important;right:10px!important;' +
            'top:auto!important;left:auto!important;width:160px!important;height:120px!important;' +
            'border:2px solid #333!important;border-radius:8px!important;z-index:9000!important;';
          if (vid) vid.style.cssText = css;
          if (canvas) canvas.style.cssText = css.replace('9000', '9001');
          var wgDot = document.getElementById('webgazerGazeDot');
          if (wgDot) wgDot.style.display = 'none';
        }, 1500);

        if (!_isCalibrated) {
          console.log('[shared] First visit — calibrating');
          var cal = new CalibrationSystem(function () {
            _isCalibrated = true;
          });
          cal.start();
        }
      })
      .catch(function (err) {
        console.error('[shared] webgazer.begin() failed:', err);
      });

  } catch (err) {
    console.error('[shared] WebGazer setup error:', err);
  }
}

function forceRecalibrate() {
  sessionStorage.removeItem('eyeq_calibrated');
  _isCalibrated = false;
  var cal = new CalibrationSystem(function () {
    _isCalibrated = true;
  });
  cal.start();
}

/* Wire recalibrate button click */
var _calBtn = document.getElementById('calibrate-btn');
if (_calBtn) {
  _calBtn.addEventListener('click', function () {
    forceRecalibrate();
  });
}

console.log('[shared] Ready ✓');