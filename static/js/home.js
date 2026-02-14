window.alert = function() {};

const gazeDot = document.getElementById('gaze-dot');
const calibrateBtn = document.getElementById('calibrate-btn');

const DWELL_THRESHOLD = 2000;
const SNAP_DISTANCE = 150;
let dwellTarget = null;
let dwellStart = 0;
let isCalibrated = false;

let activeDwellButtons = [];

class GazeSmoother {
  constructor() {
    this.alpha = 0.25;
    this.smoothX = null;
    this.smoothY = null;
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastRawX = 0;
    this.lastRawY = 0;
    this.lastTime = Date.now();
    this.history = [];
    this.HISTORY_SIZE = 15;
  }

  update(rawX, rawY) {
    const now = Date.now();
    const dt = Math.max(now - this.lastTime, 1);

    this.velocityX = Math.abs(rawX - this.lastRawX) / dt;
    this.velocityY = Math.abs(rawY - this.lastRawY) / dt;
    const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);

    const adaptiveAlpha = Math.min(0.6, Math.max(0.1, speed * 2));

    if (this.smoothX === null) {
      this.smoothX = rawX;
      this.smoothY = rawY;
    } else {
      this.smoothX = adaptiveAlpha * rawX + (1 - adaptiveAlpha) * this.smoothX;
      this.smoothY = adaptiveAlpha * rawY + (1 - adaptiveAlpha) * this.smoothY;
    }

    this.history.push({ x: rawX, y: rawY });
    if (this.history.length > this.HISTORY_SIZE) this.history.shift();

    if (this.history.length >= 5) {
      const medX = this.median(this.history.map(p => p.x));
      const medY = this.median(this.history.map(p => p.y));
      const dist = Math.sqrt((rawX - medX) ** 2 + (rawY - medY) ** 2);

      if (dist > 200) {
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
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

function snapToTarget(x, y) {
  const targets = document.querySelectorAll('.mode-card, .calibrate-btn, .home-button');
  let closestTarget = null;
  let closestDist = SNAP_DISTANCE;

  targets.forEach(target => {
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    if (dist < closestDist) {
      closestDist = dist;
      closestTarget = { x: centerX, y: centerY };
    }
  });

  return closestTarget || { x, y };
}

class DwellButton {
  constructor(element, dwellTime, onActivate) {
    this.el = element;
    this.dwellTime = dwellTime || 2000;
    this.onActivate = onActivate;
    this.isGazing = false;
    this.startTime = 0;
    this.activated = false;

    if (!this.el.querySelector('.dwell-bar')) {
      const bar = document.createElement('div');
      bar.className = 'dwell-bar';
      bar.innerHTML = '<div class="dwell-fill"></div>';
      this.el.appendChild(bar);
    }
    this.fill = this.el.querySelector('.dwell-fill');
  }

  update(gazeX, gazeY) {
    if (this.activated) return;

    const rect = this.el.getBoundingClientRect();
    const pad = 50;
    const inside =
      gazeX >= rect.left - pad &&
      gazeX <= rect.right + pad &&
      gazeY >= rect.top - pad &&
      gazeY <= rect.bottom + pad;

    if (inside) {
      if (!this.isGazing) {
        this.isGazing = true;
        this.startTime = Date.now();
        this.el.classList.add('gazing');
      }
      const elapsed = Date.now() - this.startTime;
      const pct = Math.min((elapsed / this.dwellTime) * 100, 100);
      if (this.fill) this.fill.style.width = pct + '%';

      if (elapsed >= this.dwellTime) {
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

class CalibrationSystem {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.isRunning = false;

    this.pointPositions = [
      { x: 10, y: 10 },   { x: 50, y: 10 },   { x: 90, y: 10 },
      { x: 10, y: 35 },   { x: 50, y: 35 },   { x: 90, y: 35 },
      { x: 10, y: 50 },   { x: 50, y: 50 },   { x: 90, y: 50 },
      { x: 10, y: 65 },   { x: 50, y: 65 },   { x: 90, y: 65 },
      { x: 10, y: 85 },   { x: 50, y: 85 },   { x: 90, y: 85 },
    ];

    this.currentPointIndex = 0;
    this.currentRound = 0;
    this.totalRounds = 3;
    this.dotSizes = [80, 55, 35];
    this.dwellPerPoint = 2000;
    this.samplesPerPoint = 8;

    this.overlay = null;
    this.dot = null;
    this.ring = null;
    this.label = null;
    this.progressBar = null;
  }

  createUI() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'cal-overlay';
    this.overlay.innerHTML = `
      <div id="cal-instruction">
        <h2 id="cal-title">Round 1 of 3</h2>
        <p id="cal-subtitle">Look at the dot and hold your gaze steady</p>
      </div>
      <div id="cal-dot-container">
        <div id="cal-ring"></div>
        <div id="cal-dot"></div>
      </div>
      <div id="cal-progress-container">
        <div id="cal-progress-bar"></div>
      </div>
      <p id="cal-counter">Point 1 / ${this.pointPositions.length}</p>
      <button id="cal-skip-btn">Skip Calibration</button>
    `;
    document.body.appendChild(this.overlay);

    this.dot = document.getElementById('cal-dot');
    this.ring = document.getElementById('cal-ring');
    this.label = document.getElementById('cal-title');
    this.subtitle = document.getElementById('cal-subtitle');
    this.counter = document.getElementById('cal-counter');
    this.progressBar = document.getElementById('cal-progress-bar');
    
    const skipBtn = document.getElementById('cal-skip-btn');
    skipBtn.addEventListener('click', () => {
      this.skip();
    });
  }

  start() {
    this.createUI();
    this.isRunning = true;
    this.currentRound = 0;
    this.currentPointIndex = 0;

    this.shuffledPoints = [...this.pointPositions];

    this.label.textContent = 'Get Ready';
    this.subtitle.textContent = 'Position your face in the webcam and look at the screen';
    this.dot.style.display = 'none';
    this.ring.style.display = 'none';

    setTimeout(() => {
      this.startRound();
    }, 2000);
  }

  startRound() {
    this.shuffledPoints = this.shuffleArray([...this.pointPositions]);
    this.currentPointIndex = 0;

    const size = this.dotSizes[this.currentRound];
    this.label.textContent = `Round ${this.currentRound + 1} of ${this.totalRounds}`;
    this.subtitle.textContent = `Dot size: ${size}px — Look at each dot`;

    const totalPoints = this.totalRounds * this.pointPositions.length;
    const completedPoints = this.currentRound * this.pointPositions.length;
    this.progressBar.style.width = ((completedPoints / totalPoints) * 100) + '%';

    this.dot.style.display = 'block';
    this.ring.style.display = 'block';

    this.showPoint();
  }

  showPoint() {
    if (this.currentPointIndex >= this.shuffledPoints.length) {
      this.currentRound++;
      if (this.currentRound >= this.totalRounds) {
        this.complete();
        return;
      }

      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
      this.label.textContent = `Round ${this.currentRound} Complete!`;
      this.subtitle.textContent = `Next round: smaller dots for precision`;

      setTimeout(() => this.startRound(), 1500);
      return;
    }

    const pos = this.shuffledPoints[this.currentPointIndex];
    const size = this.dotSizes[this.currentRound];

    const screenX = (pos.x / 100) * window.innerWidth;
    const screenY = (pos.y / 100) * window.innerHeight;

    this.dot.style.width = size + 'px';
    this.dot.style.height = size + 'px';
    this.dot.style.left = screenX + 'px';
    this.dot.style.top = screenY + 'px';

    const ringSize = size + 20;
    this.ring.style.width = ringSize + 'px';
    this.ring.style.height = ringSize + 'px';
    this.ring.style.left = screenX + 'px';
    this.ring.style.top = screenY + 'px';

    this.ring.style.animation = 'none';
    this.ring.offsetHeight;
    this.ring.style.animation = `ring-fill ${this.dwellPerPoint}ms linear forwards`;

    this.counter.textContent = `Point ${this.currentPointIndex + 1} / ${this.shuffledPoints.length}`;

    const totalPoints = this.totalRounds * this.pointPositions.length;
    const completedPoints = this.currentRound * this.pointPositions.length + this.currentPointIndex;
    this.progressBar.style.width = ((completedPoints / totalPoints) * 100) + '%';

    const interval = this.dwellPerPoint / this.samplesPerPoint;
    let sampleCount = 0;

    const sampler = setInterval(() => {
      if (sampleCount >= this.samplesPerPoint) {
        clearInterval(sampler);
        return;
      }
      this.recordCalibrationPoint(screenX, screenY);
      sampleCount++;
    }, interval);

    setTimeout(() => {
      clearInterval(sampler);
      this.currentPointIndex++;
      this.showPoint();
    }, this.dwellPerPoint);
  }

  recordCalibrationPoint(x, y) {
    try {
      const clickEvent = new MouseEvent('click', {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.dispatchEvent(clickEvent);
    } catch (e) {
      console.warn('Calibration click failed:', e);
    }
  }

  complete() {
    this.isRunning = false;
    this.progressBar.style.width = '100%';
    this.label.textContent = '✅ Calibration Complete!';
    this.subtitle.textContent = 'You can now use eye tracking';
    this.dot.style.display = 'none';
    this.ring.style.display = 'none';
    this.counter.textContent = '';

    setTimeout(() => {
      this.overlay.remove();
      if (this.onComplete) this.onComplete();
    }, 1500);
  }

  skip() {
    this.isRunning = false;
    this.overlay.remove();
    if (this.onComplete) this.onComplete();
  }

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

const smoother = new GazeSmoother();

function resetDwellBars() {
  document.querySelectorAll('.mode-card .dwell-fill').forEach(f => f.style.width = '0%');
}

function handleGaze(x, y) {
  const cards = document.querySelectorAll('.mode-card');
  let gazedCard = null;

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const pad = 50;
    const inside = x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;

    if (inside) {
      gazedCard = card;
      card.classList.add('gazing');
    } else {
      card.classList.remove('gazing');
    }
  });

  if (gazedCard) {
    if (gazedCard !== dwellTarget) {
      dwellTarget = gazedCard;
      dwellStart = Date.now();
      resetDwellBars();
    }

    const elapsed = Date.now() - dwellStart;
    const pct = Math.min((elapsed / DWELL_THRESHOLD) * 100, 100);
    const fill = gazedCard.querySelector('.dwell-fill');
    if (fill) fill.style.width = pct + '%';

    if (elapsed >= DWELL_THRESHOLD) {
      const href = gazedCard.getAttribute('data-href');
      if (href) {
        window.location.href = href;
      }
    }
  } else {
    dwellTarget = null;
    dwellStart = 0;
    resetDwellBars();
  }
}

async function startWebGazer() {
  if (typeof webgazer === 'undefined') return;

  try {
    webgazer.setRegression('ridge');
    webgazer.showVideoPreview(true);
    webgazer.showPredictionPoints(false);

    webgazer.setGazeListener(function (data, timestamp) {
      if (data == null) return;
      let pt = smoother.update(data.x, data.y);
      pt = snapToTarget(pt.x, pt.y);

      gazeDot.style.display = 'block';
      gazeDot.style.left = pt.x + 'px';
      gazeDot.style.top = pt.y + 'px';

      if (isCalibrated) {
        handleGaze(pt.x, pt.y);
        activeDwellButtons.forEach(b => b.update(pt.x, pt.y));
      }
    });

    await webgazer.begin();

    setTimeout(() => {
      const vid = document.getElementById('webgazerVideoFeed');
      const canvas = document.getElementById('webgazerVideoCanvas');
      if (vid) {
        vid.style.cssText = 'position:fixed!important;bottom:10px!important;right:10px!important;top:auto!important;left:auto!important;width:160px!important;height:120px!important;border:2px solid #333!important;border-radius:8px!important;z-index:9000!important;';
      }
      if (canvas) {
        canvas.style.cssText = 'position:fixed!important;bottom:10px!important;right:10px!important;top:auto!important;left:auto!important;width:160px!important;height:120px!important;z-index:9001!important;';
      }
    }, 1000);
  } catch (err) {
    console.error('WebGazer error:', err);
  }
}

if (calibrateBtn) {
  const calDwell = new DwellButton(calibrateBtn, 1500, () => {
    const cal = new CalibrationSystem(() => {
      isCalibrated = true;
      calDwell.reset();
    });
    cal.start();
  });
  activeDwellButtons.push(calDwell);

  calibrateBtn.onclick = () => {
    const cal = new CalibrationSystem(() => {
      isCalibrated = true;
    });
    cal.start();
  };
}

const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
  const homeDwell = new DwellButton(homeBtn, 1500, () => {
    window.location.href = '/';
  });
  activeDwellButtons.push(homeDwell);
}

window.addEventListener('load', () => {
  startWebGazer().then(() => {
    const cal = new CalibrationSystem(() => {
      isCalibrated = true;
    });
    cal.start();
  });
});