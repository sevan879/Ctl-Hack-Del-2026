console.log('[quiz] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[quiz] DOM ready');

  var questions = [];
  var currentQ = 0;
  var score = 0;
  var questionStartTime = 0;
  var timerInterval = null;
  var results = [];
  var answered = false;

  var dwellTarget = null;
  var dwellStart = 0;
  var DWELL_THRESHOLD = 1800;
  var activeDwellButtons = [];

  var startScreen = document.getElementById('start-screen');
  var quizScreen = document.getElementById('quiz-screen');
  var resultsScreen = document.getElementById('results-screen');
  var topicInput = document.getElementById('topic-input');
  var startBtn = document.getElementById('start-btn');

  var topicRecognition = null;
  var topicIsListening = false;
  var topicDwellBtn = null;

  console.log('[quiz] Elements:', {
    startScreen: !!startScreen,
    quizScreen: !!quizScreen,
    resultsScreen: !!resultsScreen,
    topicInput: !!topicInput,
    startBtn: !!startBtn,
  });

  function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.remove('active');
    });
    screen.classList.add('active');
    activeDwellButtons.forEach(function (b) { b.reset(); });
    activeDwellButtons = [];
    setupDwellButtons();
  }

  function setupDwellButtons() {
    var homeBtn = document.getElementById('home-btn');
    var calibrateBtn = document.getElementById('calibrate-btn');

    if (homeBtn) {
      activeDwellButtons.push(new DwellButton(homeBtn, 1500, function () {
        window.location.href = '/';
      }));
    }
    if (calibrateBtn) {
      activeDwellButtons.push(new DwellButton(calibrateBtn, 1500, function () {
        forceRecalibrate();
      }));
    }
    if (startBtn && startScreen && startScreen.classList.contains('active')) {
      activeDwellButtons.push(new DwellButton(startBtn, 1500, function () {
        startBtn.click();
      }));
      initTopicSTT();
    }
  }

  function initTopicSTT() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    var wrapper = document.querySelector('.topic-input-wrapper');
    var voiceStatus = document.getElementById('voice-status');

    if (!wrapper || !topicInput) return;
    if (topicDwellBtn) return;

    topicRecognition = new SR();
    topicRecognition.continuous = false;
    topicRecognition.interimResults = true;
    topicRecognition.lang = 'en-US';
    topicRecognition.maxAlternatives = 1;

    topicRecognition.onstart = function () {
      topicIsListening = true;
      wrapper.classList.add('listening');
      wrapper.classList.remove('gazing');
      if (voiceStatus) voiceStatus.textContent = '🎤 Listening... speak your topic';
    };

    topicRecognition.onresult = function (event) {
      var finalTranscript = '';
      var interimTranscript = '';

      for (var i = event.resultIndex; i < event.results.length; i++) {
        var t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      if (finalTranscript) {
        topicInput.value = finalTranscript.trim();
        if (voiceStatus) voiceStatus.textContent = '✅ Got it: "' + finalTranscript.trim() + '"';
      } else if (interimTranscript) {
        topicInput.value = interimTranscript;
        if (voiceStatus) voiceStatus.textContent = '🎤 Hearing: "' + interimTranscript + '"';
      }
    };

    topicRecognition.onerror = function (event) {
      topicIsListening = false;
      wrapper.classList.remove('listening');
      if (voiceStatus) voiceStatus.textContent = '❌ Error: ' + event.error;
    };

    topicRecognition.onend = function () {
      topicIsListening = false;
      wrapper.classList.remove('listening');
      if (topicDwellBtn) topicDwellBtn.reset();
      setTimeout(function () {
        if (voiceStatus && !topicIsListening) voiceStatus.textContent = '';
      }, 3000);
    };

    function startTopicListening() {
      if (topicRecognition && !topicIsListening) {
        try {
          topicRecognition.start();
        } catch (e) {
          topicRecognition.stop();
          setTimeout(function () { topicRecognition.start(); }, 100);
        }
      }
    }

    topicDwellBtn = new DwellButton(wrapper, 2000, function () {
      startTopicListening();
      setTimeout(function () { topicDwellBtn.reset(); }, 2500);
    });
    activeDwellButtons.push(topicDwellBtn);

    wrapper.addEventListener('click', function () {
      if (topicIsListening) {
        topicRecognition.stop();
      } else {
        startTopicListening();
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', function () {
      var topic = topicInput.value.trim();
      if (!topic) return;

      var difficulty = document.getElementById('difficulty-select').value;
      var loading = document.getElementById('loading');
      loading.style.display = 'block';
      startBtn.disabled = true;

      fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic, difficulty: difficulty, num_questions: 5 }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          questions = data.questions;
          loading.style.display = 'none';
          history.pushState({ screen: 'quiz' }, '', '/ai-quiz');
          showScreen(quizScreen);
          loadQuestion(0);
        })
        .catch(function (err) {
          loading.style.display = 'none';
          startBtn.disabled = false;
          console.error('[quiz] Generate error:', err);
        });
    });
  }

  window.addEventListener('popstate', function () {
    if (quizScreen.classList.contains('active') || resultsScreen.classList.contains('active')) {
      showScreen(startScreen);
      questions = []; currentQ = 0; score = 0; results = [];
      topicInput.value = ''; startBtn.disabled = false;
    }
  });

  function handleQuizGaze(x, y) {
    var options = document.querySelectorAll('#quiz-screen .option');
    var gazedIndex = null;

    options.forEach(function (opt, i) {
      var rect = opt.getBoundingClientRect();
      var pad = 60;
      var inside = x >= rect.left - pad && x <= rect.right + pad &&
                   y >= rect.top - pad && y <= rect.bottom + pad;
      if (inside) { gazedIndex = i; opt.classList.add('gazing'); }
      else { opt.classList.remove('gazing'); }
    });

    if (gazedIndex !== null) {
      if (gazedIndex !== dwellTarget) {
        dwellTarget = gazedIndex;
        dwellStart = Date.now();
        resetDwellBars();
      }
      var elapsed = Date.now() - dwellStart;
      var pct = Math.min((elapsed / DWELL_THRESHOLD) * 100, 100);
      var fill = options[gazedIndex].querySelector('.dwell-fill');
      if (fill) fill.style.width = pct + '%';
      if (elapsed >= DWELL_THRESHOLD) selectAnswer(gazedIndex, elapsed);
    } else {
      dwellTarget = null;
      dwellStart = 0;
      resetDwellBars();
    }
  }

  function resetDwellBars() {
    document.querySelectorAll('.option .dwell-fill').forEach(function (f) {
      f.style.width = '0%';
    });
  }

  function loadQuestion(index) {
    currentQ = index;
    answered = false;
    dwellTarget = null;
    dwellStart = 0;
    resetDwellBars();
    activeDwellButtons = [];
    setupDwellButtons();

    var q = questions[index];
    document.getElementById('q-counter').textContent = 'Question ' + (index + 1) + '/' + questions.length;
    document.getElementById('score').textContent = 'Score: ' + score;
    document.getElementById('question-text').textContent = q.question;

    var options = document.querySelectorAll('#quiz-screen .option');
    options.forEach(function (opt, i) {
      opt.querySelector('.option-text').textContent = q.options[i];
      opt.className = 'option';
      opt.onclick = function () {
        if (!answered) selectAnswer(i, 0);
      };
    });

    document.getElementById('feedback').style.display = 'none';
    questionStartTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(function () {
      var secs = Math.floor((Date.now() - questionStartTime) / 1000);
      document.getElementById('timer').textContent = '⏱ ' + secs + 's';
    }, 1000);
  }

  function selectAnswer(selectedIndex, dwellTime) {
    answered = true;
    clearInterval(timerInterval);
    var q = questions[currentQ];
    var isCorrect = selectedIndex === q.correct;
    var timeToAnswer = Date.now() - questionStartTime;
    if (isCorrect) score++;

    var options = document.querySelectorAll('#quiz-screen .option');
    options.forEach(function (opt) { opt.classList.remove('gazing'); });
    options[selectedIndex].classList.add(isCorrect ? 'correct' : 'wrong');
    options[q.correct].classList.add('correct');

    var feedback = document.getElementById('feedback');
    feedback.style.display = 'block';
    document.getElementById('feedback-text').textContent = isCorrect ? '✅ Correct!' : '❌ Wrong!';
    document.getElementById('explanation').textContent = q.explanation;
    document.getElementById('score').textContent = 'Score: ' + score;

    results.push({
      question: q.question,
      selected: selectedIndex,
      correct: q.correct,
      isCorrect: isCorrect,
      dwellTime: dwellTime,
      timeToAnswer: timeToAnswer,
    });

    var nextBtn = document.getElementById('next-btn');
    nextBtn.textContent = currentQ >= questions.length - 1 ? 'See Results →' : 'Next Question →';

    activeDwellButtons.push(new DwellButton(nextBtn, 1500, function () {
      if (currentQ >= questions.length - 1) showResults();
      else loadQuestion(currentQ + 1);
    }));
  }

  function showResults() {
    showScreen(resultsScreen);
    var pct = Math.round((score / questions.length) * 100);
    document.getElementById('final-score').textContent =
      score + '/' + questions.length + ' (' + pct + '%)';

    var details = '';
    results.forEach(function (r, i) {
      var icon = r.isCorrect ? '✅' : '❌';
      var time = (r.timeToAnswer / 1000).toFixed(1);
      details += icon + ' Q' + (i + 1) + ': ' + time + 's';
      if (r.dwellTime > 0) details += ' (stared ' + (r.dwellTime / 1000).toFixed(1) + 's)';
      details += '\n';
    });
    document.getElementById('results-details').textContent = details;

    var restartBtn = document.getElementById('restart-btn');
    activeDwellButtons.push(new DwellButton(restartBtn, 2000, function () {
      questions = []; currentQ = 0; score = 0; results = [];
      topicInput.value = ''; startBtn.disabled = false;
      showScreen(startScreen);
    }));
  }

  document.addEventListener('click', function (e) {
    if (e.target.id === 'next-btn' || (e.target.closest && e.target.closest('#next-btn'))) {
      if (!answered) return;
      if (currentQ >= questions.length - 1) showResults();
      else loadQuestion(currentQ + 1);
    }
    if (e.target.id === 'restart-btn' || (e.target.closest && e.target.closest('#restart-btn'))) {
      questions = []; currentQ = 0; score = 0; results = [];
      topicInput.value = ''; startBtn.disabled = false;
      showScreen(startScreen);
    }
  });

  onGaze(function (x, y) {
    if (quizScreen && quizScreen.classList.contains('active') && !answered) {
      handleQuizGaze(x, y);
    }
    activeDwellButtons.forEach(function (b) { b.update(x, y); });
  });

  setupDwellButtons();
  console.log('[quiz] Booting WebGazer...');
  bootWebGazer();
});