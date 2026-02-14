// ==================== STATE ====================
let questions = [];
let currentQ = 0;
let score = 0;
let questionStartTime = 0;
let timerInterval = null;
let results = [];

// Dwell selection state
let dwellTarget = null;   // which option index we're looking at
let dwellStart = 0;       // when we started looking at it
const DWELL_THRESHOLD = 2000;  // stare for 2 seconds to select
let answered = false;

// ==================== DOM ====================
const gazeDot = document.getElementById('gaze-dot');

const startScreen = document.getElementById('start-screen');
const calScreen = document.getElementById('calibration-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

// ==================== SCREEN SWITCHING ====================
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// ==================== START ====================
document.getElementById('start-btn').addEventListener('click', async () => {
  const topic = document.getElementById('topic-input').value.trim();
  if (!topic) { alert('Enter a topic!'); return; }

  const difficulty = document.getElementById('difficulty-select').value;
  const loading = document.getElementById('loading');

  loading.style.display = 'block';
  document.getElementById('start-btn').disabled = true;

  try {
    const res = await fetch('/api/generate-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty, num_questions: 5 }),
    });
    const data = await res.json();
    questions = data.questions;

    loading.style.display = 'none';
    showScreen(calScreen);
    startWebGazer();

  } catch (err) {
    loading.style.display = 'none';
    alert('Error generating quiz: ' + err.message);
    document.getElementById('start-btn').disabled = false;
  }
});

// ==================== CALIBRATION ====================
document.querySelectorAll('.cal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.add('clicked');
  });
});

document.getElementById('cal-done-btn').addEventListener('click', () => {
  showScreen(quizScreen);
  loadQuestion(0);
});

// ==================== WEBGAZER ====================
const buf = [];
const BUF_SIZE = 6;

function smooth(x, y) {
  buf.push({ x, y });
  if (buf.length > BUF_SIZE) buf.shift();
  let sx = 0, sy = 0;
  for (const p of buf) { sx += p.x; sy += p.y; }
  return { x: sx / buf.length, y: sy / buf.length };
}

async function startWebGazer() {
  if (typeof webgazer === 'undefined') return;

  try {
    webgazer.setRegression('ridge');
    webgazer.showVideoPreview(true);
    webgazer.showPredictionPoints(false);

    webgazer.setGazeListener(function (data, timestamp) {
      if (data == null) return;
      const pt = smooth(data.x, data.y);

      gazeDot.style.display = 'block';
      gazeDot.style.left = pt.x + 'px';
      gazeDot.style.top = pt.y + 'px';

      // Only process gaze on quiz screen
      if (quizScreen.classList.contains('active') && !answered) {
        handleQuizGaze(pt.x, pt.y);
      }
    });

    await webgazer.begin();

    // Force reposition after a delay (WebGazer creates elements late)
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

// ==================== GAZE → QUIZ LOGIC ====================
function handleQuizGaze(x, y) {
  const options = document.querySelectorAll('.option');
  let gazedIndex = null;

  options.forEach((opt, i) => {
    const rect = opt.getBoundingClientRect();
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (inside) {
      gazedIndex = i;
      opt.classList.add('gazing');
    } else {
      opt.classList.remove('gazing');
    }
  });

  // Dwell logic
  if (gazedIndex !== null) {
    if (gazedIndex !== dwellTarget) {
      // Started looking at a new option
      dwellTarget = gazedIndex;
      dwellStart = Date.now();
      resetDwellBars();
    }

    // Update dwell progress bar
    const elapsed = Date.now() - dwellStart;
    const pct = Math.min((elapsed / DWELL_THRESHOLD) * 100, 100);
    const fill = options[gazedIndex].querySelector('.dwell-fill');
    if (fill) fill.style.width = pct + '%';

    // Threshold reached — select this answer!
    if (elapsed >= DWELL_THRESHOLD) {
      selectAnswer(gazedIndex, elapsed);
    }
  } else {
    // Looking away from all options
    dwellTarget = null;
    dwellStart = 0;
    resetDwellBars();
  }
}

function resetDwellBars() {
  document.querySelectorAll('.dwell-fill').forEach(f => f.style.width = '0%');
}

// ==================== QUIZ LOGIC ====================
function loadQuestion(index) {
  currentQ = index;
  answered = false;
  dwellTarget = null;
  dwellStart = 0;
  resetDwellBars();

  const q = questions[index];

  document.getElementById('q-counter').textContent =
    `Question ${index + 1}/${questions.length}`;
  document.getElementById('score').textContent = `Score: ${score}`;
  document.getElementById('question-text').textContent = q.question;

  const options = document.querySelectorAll('.option');
  options.forEach((opt, i) => {
    opt.querySelector('.option-text').textContent = q.options[i];
    opt.className = 'option';  // reset classes

    // Also allow click as backup
    opt.onclick = () => {
      if (!answered) selectAnswer(i, 0);
    };
  });

  document.getElementById('feedback').style.display = 'none';

  // Start timer
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

  // Visual feedback
  const options = document.querySelectorAll('.option');
  options[selectedIndex].classList.add(isCorrect ? 'correct' : 'wrong');
  options[q.correct].classList.add('correct');

  // Show feedback
  const feedback = document.getElementById('feedback');
  feedback.style.display = 'block';
  document.getElementById('feedback-text').textContent =
    isCorrect ? '✅ Correct!' : '❌ Wrong!';
  document.getElementById('explanation').textContent = q.explanation;
  document.getElementById('score').textContent = `Score: ${score}`;

  // Save result
  results.push({
    question: q.question,
    selected: selectedIndex,
    correct: q.correct,
    isCorrect,
    dwellTime,
    timeToAnswer,
  });

  // Update next button
  const nextBtn = document.getElementById('next-btn');
  if (currentQ >= questions.length - 1) {
    nextBtn.textContent = 'See Results →';
  } else {
    nextBtn.textContent = 'Next Question →';
  }
}

// ==================== NEXT / RESULTS ====================
document.getElementById('next-btn').addEventListener('click', () => {
  if (currentQ >= questions.length - 1) {
    showResults();
  } else {
    loadQuestion(currentQ + 1);
  }
});

function showResults() {
  showScreen(resultsScreen);

  const pct = Math.round((score / questions.length) * 100);
  document.getElementById('final-score').textContent = `${score}/${questions.length} (${pct}%)`;

  let details = '';
  results.forEach((r, i) => {
    const icon = r.isCorrect ? '✅' : '❌';
    const time = (r.timeToAnswer / 1000).toFixed(1);
    details += `${icon} Q${i + 1}: ${time}s`;
    if (r.dwellTime > 0) details += ` (stared ${(r.dwellTime / 1000).toFixed(1)}s)`;
    details += '\n';
  });
  document.getElementById('results-details').textContent = details;
}

document.getElementById('restart-btn').addEventListener('click', () => {
  questions = [];
  currentQ = 0;
  score = 0;
  results = [];
  document.getElementById('topic-input').value = '';
  document.getElementById('start-btn').disabled = false;
  showScreen(startScreen);
});