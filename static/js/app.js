window.alert = function() {};

let questions = [];
let currentQ = 0;
let score = 0;
let questionStartTime = 0;
let timerInterval = null;
let results = [];
let answered = false;

let dwellTarget = null;
let dwellStart = 0;
const DWELL_THRESHOLD = 2000;
const SNAP_DISTANCE = 150;

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
  const targets = document.querySelectorAll('.option, button, .home-button, .recalibrate-btn, #start-btn, #topic-input');
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

    if (!this.el.querySelector('.btn-dwell-bar') && !this.el.querySelector('.dwell-bar')) {
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
      this.el.classList.add('dwell-hover');

      if (elapsed >= this.dwellTime) {
        this.activated = true;
        this.el.classList.add('dwell-activated');
        if (this.fill) this.fill.style.width = '100%';
        if (this.onActivate) this.onActivate();
      }
    } else {
      this.isGazing = false;
      this.startTime = 0;
      if (this.fill) this.fill.style.width = '0%';
      this.el.classList.remove('dwell-hover', 'gazing');
    }
  }

  reset() {
    this.activated = false;
    this.isGazing = false;
    this.startTime = 0;
    if (this.fill) this.fill.style.width = '0%';
    this.el.classList.remove('dwell-hover', 'dwell-activated', 'gazing');
  }
}

const gazeDot = document.getElementById('gaze-dot');
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const recalibrateBtn = document.getElementById('recalibrate-btn');
const homeBtn = document.getElementById('home-btn');
const topicInput = document.getElementById('topic-input');
const startBtn = document.getElementById('start-btn');

const smoother = new GazeSmoother();

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
  activeDwellButtons.forEach(b => b.reset());
  activeDwellButtons = [];
  setupDwellButtons();
}

function setupDwellButtons() {
  if (homeBtn) {
    const homeDwell = new DwellButton(homeBtn, 1500, () => {
      window.location.href = '/';
    });
    activeDwellButtons.push(homeDwell);
  }

  if (recalibrateBtn) {
    const recalDwell = new DwellButton(recalibrateBtn, 1500, () => {
      const cal = new CalibrationSystem(() => {
        recalDwell.reset();
      });
      cal.start();
    });
    activeDwellButtons.push(recalDwell);
  }

  if (startBtn && startScreen.classList.contains('active')) {
    const startDwell = new DwellButton(startBtn, 1500, () => {
      startBtn.click();
    });
    activeDwellButtons.push(startDwell);
  }
}

startBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) { alert('Enter a topic!'); return; }

  const difficulty = document.getElementById('difficulty-select').value;
  const loading = document.getElementById('loading');

  loading.style.display = 'block';
  startBtn.disabled = true;

  try {
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty, num_questions: 5 }),
    });
    const data = await res.json();
    questions = data.questions;

    loading.style.display = 'none';
    
    history.pushState({ screen: 'quiz' }, '', '/ai-quiz');
    
    showScreen(quizScreen);
    loadQuestion(0);

  } catch (err) {
    loading.style.display = 'none';
    alert('Error generating quiz: ' + err.message);
    startBtn.disabled = false;
  }
});

window.addEventListener('popstate', (event) => {
  if (quizScreen.classList.contains('active') || resultsScreen.classList.contains('active')) {
    showScreen(startScreen);
    questions = [];
    currentQ = 0;
    score = 0;
    results = [];
    topicInput.value = '';
    startBtn.disabled = false;
  }
});

async function startWebGazer() {
  if (typeof webgazer === 'undefined') {
    console.error('WebGazer not loaded');
    return;
  }

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

      handleInputGaze(pt.x, pt.y);

      if (quizScreen.classList.contains('active') && !answered) {
        handleQuizGaze(pt.x, pt.y);
      }

      activeDwellButtons.forEach(b => b.update(pt.x, pt.y));
    });

    await webgazer.begin();

  
    const vid = document.getElementById('webgazerVideoFeed');
    const canvas = document.getElementById('webgazerVideoCanvas');

    if (vid) {
      vid.style.cssText = 'position:fixed!important;top:20px!important;left:20px!important;' +
        'right:auto!important;bottom:auto!important;width:160px!important;height:120px!important;' +
        'border:3px solid #4f46e5!important;border-radius:12px!important;z-index:9999!important;';
    }

    if (canvas) {
      canvas.style.cssText = 'position:fixed!important;top:20px!important;left:20px!important;' +
        'right:auto!important;bottom:auto!important;width:160px!important;height:120px!important;' +
        'border:3px solid #4f46e5!important;border-radius:12px!important;z-index:10000!important;';
    }

    const wgDot = document.getElementById('webgazerGazeDot');
    if (wgDot) wgDot.style.display = 'none';

  } catch (err) {
    console.error('WebGazer error:', err);
  }
}

function handleInputGaze(x, y) {
  if (!topicInput) return;
  
  const rect = topicInput.getBoundingClientRect();
  const pad = 50;
  const inside =
    x >= rect.left - pad &&
    x <= rect.right + pad &&
    y >= rect.top - pad &&
    y <= rect.bottom + pad;

  if (inside) {
    topicInput.classList.add('gazing');
    topicInput.focus();
  } else {
    topicInput.classList.remove('gazing');
  }
}

function handleQuizGaze(x, y) {
  const options = document.querySelectorAll('#quiz-screen .option');
  let gazedIndex = null;

  options.forEach((opt, i) => {
    const rect = opt.getBoundingClientRect();
    const pad = 50;
    const inside =
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad;

    if (inside) {
      gazedIndex = i;
      opt.classList.add('gazing');
    } else {
      opt.classList.remove('gazing');
    }
  });

  if (gazedIndex !== null) {
    if (gazedIndex !== dwellTarget) {
      dwellTarget = gazedIndex;
      dwellStart = Date.now();
      resetDwellBars();
    }

    const elapsed = Date.now() - dwellStart;
    const pct = Math.min((elapsed / DWELL_THRESHOLD) * 100, 100);
    const fill = options[gazedIndex].querySelector('.dwell-fill');
    if (fill) fill.style.width = pct + '%';

    if (elapsed >= DWELL_THRESHOLD) {
      selectAnswer(gazedIndex, elapsed);
    }
  } else {
    dwellTarget = null;
    dwellStart = 0;
    resetDwellBars();
  }
}

function resetDwellBars() {
  document.querySelectorAll('.option .dwell-fill').forEach(f => f.style.width = '0%');
}

function loadQuestion(index) {
  currentQ = index;
  answered = false;
  dwellTarget = null;
  dwellStart = 0;
  resetDwellBars();
  activeDwellButtons = [];
  setupDwellButtons();

  const q = questions[index];

  document.getElementById('q-counter').textContent =
    `Question ${index + 1}/${questions.length}`;
  document.getElementById('score').textContent = `Score: ${score}`;
  document.getElementById('question-text').textContent = q.question;

  const options = document.querySelectorAll('#quiz-screen .option');
  options.forEach((opt, i) => {
    opt.querySelector('.option-text').textContent = q.options[i];
    opt.className = 'option';
    
    opt.onclick = () => {
      if (!answered) selectAnswer(i, 0);
    };
  });

  document.getElementById('feedback').style.display = 'none';

  questionStartTime = Date.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - questionStartTime) / 1000);
    document.getElementById('timer').textContent = `⏱ ${secs}s`;
  }, 1000);
}

function selectAnswer(selectedIndex, dwellTime) {
  answered = true;
  clearInterval(timerInterval);

  const q = questions[currentQ];
  const isCorrect = selectedIndex === q.correct;
  const timeToAnswer = Date.now() - questionStartTime;

  if (isCorrect) score++;

  const options = document.querySelectorAll('#quiz-screen .option');
  options.forEach(opt => opt.classList.remove('gazing'));
  options[selectedIndex].classList.add(isCorrect ? 'correct' : 'wrong');
  options[q.correct].classList.add('correct');

  const feedback = document.getElementById('feedback');
  feedback.style.display = 'block';
  document.getElementById('feedback-text').textContent =
    isCorrect ? '✅ Correct!' : '❌ Wrong!';
  document.getElementById('explanation').textContent = q.explanation;
  document.getElementById('score').textContent = `Score: ${score}`;

  results.push({
    question: q.question,
    selected: selectedIndex,
    correct: q.correct,
    isCorrect,
    dwellTime,
    timeToAnswer,
  });

  const nextBtn = document.getElementById('next-btn');
  if (currentQ >= questions.length - 1) {
    nextBtn.textContent = 'See Results →';
  } else {
    nextBtn.textContent = 'Next Question →';
  }

  const dwellBtn = new DwellButton(nextBtn, 1500, () => {
    if (currentQ >= questions.length - 1) {
      showResults();
    } else {
      loadQuestion(currentQ + 1);
    }
  });
  activeDwellButtons.push(dwellBtn);
}

function showResults() {
  showScreen(resultsScreen);

  const pct = Math.round((score / questions.length) * 100);
  document.getElementById('final-score').textContent =
    `${score}/${questions.length} (${pct}%)`;

  let details = '';
  results.forEach((r, i) => {
    const icon = r.isCorrect ? '✅' : '❌';
    const time = (r.timeToAnswer / 1000).toFixed(1);
    details += `${icon} Q${i + 1}: ${time}s`;
    if (r.dwellTime > 0) details += ` (stared ${(r.dwellTime / 1000).toFixed(1)}s)`;
    details += '\n';
  });
  document.getElementById('results-details').textContent = details;

  const restartBtn = document.getElementById('restart-btn');
  const dwellBtn = new DwellButton(restartBtn, 2000, () => {
    questions = [];
    currentQ = 0;
    score = 0;
    results = [];
    topicInput.value = '';
    startBtn.disabled = false;
    showScreen(startScreen);
  });
  activeDwellButtons.push(dwellBtn);
}

if (recalibrateBtn) {
  recalibrateBtn.onclick = () => {
    const cal = new CalibrationSystem(() => {});
    cal.start();
  };
}

if (recalibrateBtn) {
  recalibrateBtn.onclick = () => {
    const cal = new CalibrationSystem(() => {});
    cal.start();
  };
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'next-btn' || e.target.closest('#next-btn')) {
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn && !answered) return;
    
    if (currentQ >= questions.length - 1) {
      showResults();
    } else {
      loadQuestion(currentQ + 1);
    }
  }
  
  if (e.target.id === 'restart-btn' || e.target.closest('#restart-btn')) {
    questions = [];
    currentQ = 0;
    score = 0;
    results = [];
    topicInput.value = '';
    startBtn.disabled = false;
    showScreen(startScreen);
  }
});

window.addEventListener('load', () => {
  startWebGazer();
  setupDwellButtons();
});