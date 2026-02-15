console.log('[practice] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[practice] DOM ready');

  /* ── Screens ── */
  var selectScreen = document.getElementById('select-screen');
  var modeScreen = document.getElementById('mode-screen');
  var flashcardScreen = document.getElementById('flashcard-screen');
  var quizScreen = document.getElementById('quiz-screen');
  var matchScreen = document.getElementById('match-screen');
  var writeScreen = document.getElementById('write-screen');
  var resultsScreen = document.getElementById('results-screen');

  var allScreens = [selectScreen, modeScreen, flashcardScreen, quizScreen, matchScreen, writeScreen, resultsScreen];

  /* ── State ── */
  var activeDwellButtons = [];
  var allSets = [];
  var currentSet = null;
  var currentMode = null;

  /* Flashcard state */
  var fcIndex = 0;
  var fcFlipped = false;

  /* Quiz state */
  var qzCards = [];
  var qzIndex = 0;
  var qzScore = 0;
  var qzAnswered = false;
  var qzDwellTarget = null;
  var qzDwellStart = 0;
  var QZ_DWELL = 1800;

  /* Match state */
  var mtPairs = [];
  var mtTiles = [];
  var mtSelected = null;
  var mtMatched = 0;
  var mtTotal = 0;
  var mtTimerInterval = null;
  var mtStartTime = 0;
  var mtDwellTarget = null;
  var mtDwellStart = 0;
  var MT_DWELL = 1500;

  /* Write state */
  var wrCards = [];
  var wrIndex = 0;
  var wrScore = 0;
  var wrAnswered = false;

  /* ── Helpers ── */
  function showScreen(screen) {
    allScreens.forEach(function (s) { s.classList.remove('active'); });
    screen.classList.add('active');
    activeDwellButtons.forEach(function (b) { b.reset(); });
    activeDwellButtons = [];
    rebuildDwellButtons();
  }

  function showToast(msg, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast ' + (type || 'info') + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function pickIcon(title) {
    var t = (title || '').toLowerCase();
    if (t.indexOf('bio') !== -1) return '🧬';
    if (t.indexOf('chem') !== -1) return '⚗️';
    if (t.indexOf('math') !== -1) return '📐';
    if (t.indexOf('hist') !== -1) return '🏛️';
    if (t.indexOf('code') !== -1 || t.indexOf('python') !== -1) return '💻';
    var icons = ['📘', '📗', '📕', '📙', '📓', '🔬', '🧪', '📊', '✏️', '🎯'];
    var hash = 0;
    for (var i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    return icons[Math.abs(hash) % icons.length];
  }

  function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  /* ═══════════════════════════════════════
     DWELL BUTTON WIRING
     ═══════════════════════════════════════ */
  function rebuildDwellButtons() {
    var homeBtn = document.getElementById('home-btn');
    var calibrateBtn = document.getElementById('calibrate-btn');

    if (homeBtn)
      activeDwellButtons.push(new DwellButton(homeBtn, 1500, function () { window.location.href = '/'; }));
    if (calibrateBtn)
      activeDwellButtons.push(new DwellButton(calibrateBtn, 1500, function () { forceRecalibrate(); }));

    /* Select screen */
    if (selectScreen.classList.contains('active')) {
      var emptyCta = document.getElementById('empty-create-btn');
      if (emptyCta && document.getElementById('select-empty').style.display !== 'none')
        activeDwellButtons.push(new DwellButton(emptyCta, 1500, function () { window.location.href = '/create-set'; }));

      document.querySelectorAll('.select-card').forEach(function (card) {
        activeDwellButtons.push(new DwellButton(card, 1800, function () { selectSet(card.dataset.id); }));
      });
    }

    /* Mode screen */
    if (modeScreen.classList.contains('active')) {
      document.querySelectorAll('.mode-card').forEach(function (card) {
        activeDwellButtons.push(new DwellButton(card, 1500, function () { startMode(card.dataset.mode); }));
      });
      var modeBack = document.getElementById('mode-back-btn');
      if (modeBack)
        activeDwellButtons.push(new DwellButton(modeBack, 1500, function () { showScreen(selectScreen); }));
    }

    /* Flashcard screen */
    if (flashcardScreen.classList.contains('active')) {
      var prevBtn = document.getElementById('fc-prev-btn');
      var flipBtn = document.getElementById('fc-flip-btn');
      var nextBtn = document.getElementById('fc-next-btn');
      var exitBtn = document.getElementById('fc-exit-btn');

      if (prevBtn) activeDwellButtons.push(new DwellButton(prevBtn, 1200, function () { fcPrev(); }));
      if (flipBtn) activeDwellButtons.push(new DwellButton(flipBtn, 1200, function () { fcFlip(); }));
      if (nextBtn) activeDwellButtons.push(new DwellButton(nextBtn, 1200, function () { fcNext(); }));
      if (exitBtn) activeDwellButtons.push(new DwellButton(exitBtn, 1500, function () { showScreen(modeScreen); }));
    }

    /* Quiz screen */
    if (quizScreen.classList.contains('active')) {
      var qzExit = document.getElementById('qz-exit-btn');
      if (qzExit) activeDwellButtons.push(new DwellButton(qzExit, 1500, function () { showScreen(modeScreen); }));

      if (qzAnswered) {
        var qzNext = document.getElementById('qz-next-btn');
        if (qzNext) activeDwellButtons.push(new DwellButton(qzNext, 1200, function () { qzNextQuestion(); }));
      }
    }

    /* Match screen */
    if (matchScreen.classList.contains('active')) {
      var mtExit = document.getElementById('mt-exit-btn');
      if (mtExit) activeDwellButtons.push(new DwellButton(mtExit, 1500, function () { clearInterval(mtTimerInterval); showScreen(modeScreen); }));
    }

    /* Write screen */
    if (writeScreen.classList.contains('active')) {
      var wrSubmit = document.getElementById('wr-submit-btn');
      var wrExit = document.getElementById('wr-exit-btn');
      if (wrSubmit && !wrAnswered) activeDwellButtons.push(new DwellButton(wrSubmit, 1500, function () { wrCheckAnswer(); }));
      if (wrExit) activeDwellButtons.push(new DwellButton(wrExit, 1500, function () { showScreen(modeScreen); }));

      if (wrAnswered) {
        var wrNext = document.getElementById('wr-next-btn');
        if (wrNext) activeDwellButtons.push(new DwellButton(wrNext, 1200, function () { wrNextCard(); }));
      }
    }

    /* Results screen */
    if (resultsScreen.classList.contains('active')) {
      var retryBtn = document.getElementById('results-retry-btn');
      var modesBtn = document.getElementById('results-modes-btn');
      var setsBtn = document.getElementById('results-sets-btn');

      if (retryBtn) activeDwellButtons.push(new DwellButton(retryBtn, 1500, function () { startMode(currentMode); }));
      if (modesBtn) activeDwellButtons.push(new DwellButton(modesBtn, 1500, function () { showScreen(modeScreen); }));
      if (setsBtn) activeDwellButtons.push(new DwellButton(setsBtn, 1500, function () { showScreen(selectScreen); }));
    }
  }

  /* ═══════════════════════════════════════
     LOAD SETS
     ═══════════════════════════════════════ */
  function loadSets() {
    var loading = document.getElementById('select-loading');
    var empty = document.getElementById('select-empty');
    var grid = document.getElementById('select-grid');

    /* Check for ?set= query param */
    var urlParams = new URLSearchParams(window.location.search);
    var preselectedSetId = urlParams.get('set');

    fetch('/api/sets')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        allSets = data;
        loading.style.display = 'none';

        if (allSets.length === 0) {
          empty.style.display = 'flex';
          grid.style.display = 'none';
          rebuildDwellButtons();
          return;
        }

        /* If preselected, jump straight to mode select */
        if (preselectedSetId) {
          var found = false;
          for (var i = 0; i < allSets.length; i++) {
            if (allSets[i].id === preselectedSetId) {
              currentSet = allSets[i];
              found = true;
              break;
            }
          }
          if (found) {
            showModeScreen();
            return;
          }
        }

        empty.style.display = 'none';
        grid.style.display = 'grid';
        renderSelectGrid();
        rebuildDwellButtons();
      })
      .catch(function (err) {
        loading.style.display = 'none';
        empty.style.display = 'flex';
        showToast('Failed to load sets: ' + err.message, 'error');
      });
  }

  function renderSelectGrid() {
    var grid = document.getElementById('select-grid');
    grid.innerHTML = '';

    allSets.forEach(function (set) {
      var count = set.cards ? set.cards.length : 0;
      if (count === 0) return;

      var card = document.createElement('div');
      card.className = 'select-card';
      card.dataset.id = set.id;
      card.innerHTML =
        '<div class="select-card-icon">' + pickIcon(set.title) + '</div>' +
        '<div class="select-card-title">' + escapeHtml(set.title) + '</div>' +
        '<div class="select-card-count">🃏 ' + count + ' card' + (count !== 1 ? 's' : '') + '</div>' +
        '<div class="dwell-bar"><div class="dwell-fill"></div></div>';

      card.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        selectSet(set.id);
      });
      grid.appendChild(card);
    });
  }

  function selectSet(setId) {
    for (var i = 0; i < allSets.length; i++) {
      if (allSets[i].id === setId) {
        currentSet = allSets[i];
        break;
      }
    }
    if (!currentSet) return;
    showModeScreen();
  }

  function showModeScreen() {
    document.getElementById('mode-set-title').textContent = '📖 ' + currentSet.title;
    var count = currentSet.cards ? currentSet.cards.length : 0;
    document.getElementById('mode-set-info').textContent = count + ' cards — choose a study mode';
    showScreen(modeScreen);
  }

  /* ═══════════════════════════════════════
     MODE DISPATCH
     ═══════════════════════════════════════ */
  function startMode(mode) {
    currentMode = mode;
    if (mode === 'flashcards') startFlashcards();
    else if (mode === 'quiz') startQuiz();
    else if (mode === 'match') startMatch();
    else if (mode === 'write') startWrite();
  }

  /* Click handlers for mode cards */
  document.querySelectorAll('.mode-card').forEach(function (card) {
    card.addEventListener('click', function () { startMode(card.dataset.mode); });
  });

  document.getElementById('mode-back-btn').addEventListener('click', function () { showScreen(selectScreen); });

  /* ═══════════════════════════════════════
     FLASHCARDS
     ═══════════════════════════════════════ */
  function startFlashcards() {
    fcIndex = 0;
    fcFlipped = false;
    showScreen(flashcardScreen);
    loadFlashcard();
  }

  function loadFlashcard() {
    var cards = currentSet.cards;
    var card = cards[fcIndex];

    document.getElementById('fc-front-text').textContent = card.term;
    document.getElementById('fc-back-text').textContent = card.definition;
    document.getElementById('fc-counter').textContent = (fcIndex + 1) + ' / ' + cards.length;
    document.getElementById('fc-progress-text').textContent = Math.round(((fcIndex + 1) / cards.length) * 100) + '% complete';
    document.getElementById('fc-progress-fill').style.width = (((fcIndex + 1) / cards.length) * 100) + '%';

    fcFlipped = false;
    document.getElementById('fc-card-inner').classList.remove('flipped');
  }

  function fcFlip() {
    fcFlipped = !fcFlipped;
    var inner = document.getElementById('fc-card-inner');
    if (fcFlipped) inner.classList.add('flipped');
    else inner.classList.remove('flipped');
  }

  function fcNext() {
    if (fcIndex < currentSet.cards.length - 1) {
      fcIndex++;
      loadFlashcard();
    } else {
      showResults('flashcards', { total: currentSet.cards.length });
    }
  }

  function fcPrev() {
    if (fcIndex > 0) {
      fcIndex--;
      loadFlashcard();
    }
  }

  document.getElementById('fc-flip-btn').addEventListener('click', fcFlip);
  document.getElementById('fc-next-btn').addEventListener('click', fcNext);
  document.getElementById('fc-prev-btn').addEventListener('click', fcPrev);
  document.getElementById('fc-exit-btn').addEventListener('click', function () { showScreen(modeScreen); });
  document.getElementById('fc-card').addEventListener('click', fcFlip);

  /* ═══════════════════════════════════════
     QUIZ MODE
     ═══════════════════════════════════════ */
  function startQuiz() {
    qzCards = shuffleArray(currentSet.cards.slice());
    qzIndex = 0;
    qzScore = 0;
    qzAnswered = false;
    showScreen(quizScreen);
    loadQuizQuestion();
  }

  function loadQuizQuestion() {
    qzAnswered = false;
    qzDwellTarget = null;
    qzDwellStart = 0;

    var card = qzCards[qzIndex];
    document.getElementById('qz-counter').textContent = 'Question ' + (qzIndex + 1) + ' / ' + qzCards.length;
    document.getElementById('qz-score').textContent = 'Score: ' + qzScore;
    document.getElementById('qz-question').textContent = 'What is the definition of "' + card.term + '"?';
    document.getElementById('qz-feedback').style.display = 'none';

    /* Build options */
    var wrongCards = currentSet.cards.filter(function (c) { return c.term !== card.term; });
    wrongCards = shuffleArray(wrongCards).slice(0, 3);
    var options = shuffleArray([card].concat(wrongCards));

    var container = document.getElementById('qz-options');
    container.innerHTML = '';

    options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.className = 'qz-option';
      btn.dataset.index = i;
      btn.dataset.correct = (opt.term === card.term) ? 'true' : 'false';
      btn.innerHTML =
        '<span>' + escapeHtml(opt.definition) + '</span>' +
        '<div class="dwell-bar"><div class="dwell-fill"></div></div>';

      btn.addEventListener('click', function () {
        if (!qzAnswered) qzSelectAnswer(btn);
      });

      container.appendChild(btn);
    });

    activeDwellButtons = [];
    rebuildDwellButtons();
  }

  function qzSelectAnswer(btn) {
    qzAnswered = true;
    var isCorrect = btn.dataset.correct === 'true';
    if (isCorrect) qzScore++;

    var allOpts = document.querySelectorAll('.qz-option');
    allOpts.forEach(function (opt) {
      opt.classList.remove('gazing');
      if (opt.dataset.correct === 'true') opt.classList.add('correct');
    });
    if (!isCorrect) btn.classList.add('wrong');

    var feedback = document.getElementById('qz-feedback');
    feedback.style.display = 'block';
    document.getElementById('qz-feedback-text').textContent = isCorrect ? '✅ Correct!' : '❌ Wrong!';

    var correctCard = qzCards[qzIndex];
    document.getElementById('qz-explanation').textContent = correctCard.term + ' = ' + correctCard.definition;
    document.getElementById('qz-score').textContent = 'Score: ' + qzScore;

    var nextBtn = document.getElementById('qz-next-btn');
    nextBtn.querySelector('span').textContent = qzIndex >= qzCards.length - 1 ? 'See Results →' : 'Next →';

    activeDwellButtons = [];
    rebuildDwellButtons();
  }

  function qzNextQuestion() {
    if (qzIndex >= qzCards.length - 1) {
      showResults('quiz', { score: qzScore, total: qzCards.length });
    } else {
      qzIndex++;
      loadQuizQuestion();
    }
  }

  document.getElementById('qz-next-btn').addEventListener('click', function () { qzNextQuestion(); });
  document.getElementById('qz-exit-btn').addEventListener('click', function () { showScreen(modeScreen); });

  /* Quiz gaze handler */
  function handleQuizGaze(x, y) {
    if (qzAnswered) return;

    var options = document.querySelectorAll('.qz-option');
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
      if (gazedIndex !== qzDwellTarget) {
        qzDwellTarget = gazedIndex;
        qzDwellStart = Date.now();
        options.forEach(function (o) { var f = o.querySelector('.dwell-fill'); if (f) f.style.width = '0%'; });
      }
      var elapsed = Date.now() - qzDwellStart;
      var pct = Math.min((elapsed / QZ_DWELL) * 100, 100);
      var fill = options[gazedIndex].querySelector('.dwell-fill');
      if (fill) fill.style.width = pct + '%';
      if (elapsed >= QZ_DWELL) qzSelectAnswer(options[gazedIndex]);
    } else {
      qzDwellTarget = null;
      qzDwellStart = 0;
      options.forEach(function (o) {
        var f = o.querySelector('.dwell-fill');
        if (f) f.style.width = '0%';
      });
    }
  }

  /* ═══════════════════════════════════════
     MATCH MODE
     ═══════════════════════════════════════ */
  function startMatch() {
    clearInterval(mtTimerInterval);
    mtSelected = null;
    mtMatched = 0;

    /* Use up to 6 cards */
    var cards = shuffleArray(currentSet.cards.slice()).slice(0, 6);
    mtTotal = cards.length;
    mtPairs = [];

    cards.forEach(function (card, i) {
      mtPairs.push({ id: i, type: 'term', text: card.term, pairId: i });
      mtPairs.push({ id: i, type: 'def', text: card.definition, pairId: i });
    });

    mtPairs = shuffleArray(mtPairs);

    showScreen(matchScreen);
    renderMatchBoard();

    mtStartTime = Date.now();
    mtTimerInterval = setInterval(function () {
      var secs = Math.floor((Date.now() - mtStartTime) / 1000);
      document.getElementById('mt-timer').textContent = '⏱ ' + secs + 's';
    }, 1000);
  }

  function renderMatchBoard() {
    var board = document.getElementById('mt-board');
    board.innerHTML = '';

    document.getElementById('mt-counter').textContent = mtMatched + ' / ' + mtTotal + ' matched';

    mtTiles = [];
    mtPairs.forEach(function (pair, i) {
      var tile = document.createElement('div');
      tile.className = 'mt-tile';
      tile.dataset.index = i;
      tile.dataset.pairId = pair.pairId;
      tile.dataset.type = pair.type;
      tile.textContent = pair.text;
      tile.innerHTML += '<div class="dwell-bar"><div class="dwell-fill"></div></div>';

      tile.addEventListener('click', function () { mtSelectTile(tile); });
      board.appendChild(tile);
      mtTiles.push(tile);
    });
  }

  function mtSelectTile(tile) {
    if (tile.classList.contains('matched')) return;

    if (mtSelected === null) {
      mtSelected = tile;
      tile.classList.add('selected');
    } else if (mtSelected === tile) {
      tile.classList.remove('selected');
      mtSelected = null;
    } else {
      /* Check match */
      var id1 = mtSelected.dataset.pairId;
      var id2 = tile.dataset.pairId;
      var type1 = mtSelected.dataset.type;
      var type2 = tile.dataset.type;

      if (id1 === id2 && type1 !== type2) {
        /* Match! */
        mtSelected.classList.remove('selected');
        mtSelected.classList.add('matched');
        tile.classList.add('matched');
        mtMatched++;
        document.getElementById('mt-counter').textContent = mtMatched + ' / ' + mtTotal + ' matched';

        if (mtMatched >= mtTotal) {
          clearInterval(mtTimerInterval);
          var time = Math.floor((Date.now() - mtStartTime) / 1000);
          setTimeout(function () {
            showResults('match', { total: mtTotal, time: time });
          }, 800);
        }
      } else {
        /* No match */
        var prev = mtSelected;
        prev.classList.remove('selected');
        prev.classList.add('wrong-match');
        tile.classList.add('wrong-match');

        setTimeout(function () {
          prev.classList.remove('wrong-match');
          tile.classList.remove('wrong-match');
        }, 600);
      }
      mtSelected = null;
    }
  }

  /* Match gaze handler */
  function handleMatchGaze(x, y) {
    var tiles = document.querySelectorAll('.mt-tile:not(.matched)');
    var gazedTile = null;

    tiles.forEach(function (tile) {
      var rect = tile.getBoundingClientRect();
      var pad = 50;
      var inside = x >= rect.left - pad && x <= rect.right + pad &&
                   y >= rect.top - pad && y <= rect.bottom + pad;
      if (inside) { gazedTile = tile; tile.classList.add('gazing'); }
      else { tile.classList.remove('gazing'); }
    });

    if (gazedTile) {
      var idx = gazedTile.dataset.index;
      if (idx !== mtDwellTarget) {
        mtDwellTarget = idx;
        mtDwellStart = Date.now();
        tiles.forEach(function (t) { var f = t.querySelector('.dwell-fill'); if (f) f.style.width = '0%'; });
      }
      var elapsed = Date.now() - mtDwellStart;
      var pct = Math.min((elapsed / MT_DWELL) * 100, 100);
      var fill = gazedTile.querySelector('.dwell-fill');
      if (fill) fill.style.width = pct + '%';
      if (elapsed >= MT_DWELL) {
        mtSelectTile(gazedTile);
        mtDwellTarget = null;
        mtDwellStart = 0;
      }
    } else {
      mtDwellTarget = null;
      mtDwellStart = 0;
      tiles.forEach(function (t) { var f = t.querySelector('.dwell-fill'); if (f) f.style.width = '0%'; });
    }
  }

  document.getElementById('mt-exit-btn').addEventListener('click', function () {
    clearInterval(mtTimerInterval);
    showScreen(modeScreen);
  });

  /* ═══════════════════════════════════════
     WRITE MODE
     ═══════════════════════════════════════ */
  function startWrite() {
    wrCards = shuffleArray(currentSet.cards.slice());
    wrIndex = 0;
    wrScore = 0;
    wrAnswered = false;
    showScreen(writeScreen);
    loadWriteCard();
  }

  function loadWriteCard() {
    wrAnswered = false;
    var card = wrCards[wrIndex];

    document.getElementById('wr-counter').textContent = (wrIndex + 1) + ' / ' + wrCards.length;
    document.getElementById('wr-score').textContent = 'Score: ' + wrScore;
    document.getElementById('wr-term').textContent = card.term;
    document.getElementById('wr-input').value = '';
    document.getElementById('wr-feedback').style.display = 'none';
    document.getElementById('wr-submit-btn').style.display = '';

    // Reset voiceSystem so it doesn't carry over old text
    if (typeof voiceSystem !== 'undefined') {
      voiceSystem.existingText = '';
    }

    activeDwellButtons = [];
    rebuildDwellButtons();

    // Auto-start voice after card renders
    setTimeout(function () {
      if (!wrAnswered && writeScreen.classList.contains('active')) {
        wrStartVoice();
      }
    }, 600);
  }

  // NEW FUNCTION — add this alongside the other write functions
  function wrStartVoice() {
    if (wrAnswered) return;
    if (typeof switchToFieldMode !== 'function') return;

    var wrapper = document.getElementById('wr-input-wrapper');
    if (!wrapper) return;

    // Clear old text so voice starts fresh
    var input = document.getElementById('wr-input');
    if (input) input.value = '';
    if (typeof voiceSystem !== 'undefined') voiceSystem.existingText = '';

    switchToFieldMode(wrapper, function () {
      // Fired when user says "EyeQ done"
      var answer = document.getElementById('wr-input').value.trim();
      if (answer && !wrAnswered) {
        wrCheckAnswer();
      }
    });
  }

  function handleWriteGaze(x, y) {
    var input = document.getElementById('wr-input');
    if (!input || wrAnswered) return;

    var rect = input.getBoundingClientRect();
    var pad = 60;
    var inside = x >= rect.left - pad && x <= rect.right + pad &&
                 y >= rect.top - pad && y <= rect.bottom + pad;

    if (inside) {
      input.classList.add('gazing');
      // Re-activate voice if it stopped
      if (typeof voiceSystem !== 'undefined' && voiceSystem.mode !== 'field') {
        wrStartVoice();
      }
    } else {
      input.classList.remove('gazing');
    }
  }

  function wrCheckAnswer() {
    wrAnswered = true;

    // Stop voice when answer is submitted
    if (typeof switchToGlobalMode === 'function') switchToGlobalMode();

    var card = wrCards[wrIndex];
    var userAnswer = document.getElementById('wr-input').value.trim().toLowerCase();
    var correctAnswer = card.definition.trim().toLowerCase();

    var isCorrect = userAnswer === correctAnswer;
    if (!isCorrect) {
      var userWords = userAnswer.split(/\s+/);
      var correctWords = correctAnswer.split(/\s+/);
      var matchCount = 0;
      userWords.forEach(function (w) {
        if (correctWords.indexOf(w) !== -1) matchCount++;
      });
      if (correctWords.length > 0 && matchCount / correctWords.length >= 0.7) {
        isCorrect = true;
      }
    }

    if (isCorrect) wrScore++;

    var feedback = document.getElementById('wr-feedback');
    feedback.style.display = 'block';
    document.getElementById('wr-feedback-text').textContent = isCorrect ? '✅ Correct!' : '❌ Not quite';
    document.getElementById('wr-correct-answer').textContent = 'Answer: ' + card.definition;
    document.getElementById('wr-score').textContent = 'Score: ' + wrScore;
    document.getElementById('wr-submit-btn').style.display = 'none';

    var nextBtn = document.getElementById('wr-next-btn');
    nextBtn.querySelector('span').textContent = wrIndex >= wrCards.length - 1 ? 'See Results →' : 'Next →';

    activeDwellButtons = [];
    rebuildDwellButtons();
  }

  function wrNextCard() {
    if (wrIndex >= wrCards.length - 1) {
      showResults('write', { score: wrScore, total: wrCards.length });
    } else {
      wrIndex++;
      loadWriteCard();
    }
  }

  /* ═══════════════════════════════════════
     RESULTS
     ═══════════════════════════════════════ */
  function showResults(mode, data) {
    showScreen(resultsScreen);

    var title = 'Practice Complete!';
    var scoreText = '';
    var details = '';

    if (mode === 'flashcards') {
      title = '🃏 Flashcards Complete!';
      scoreText = data.total + ' cards reviewed';
      details = 'You went through all ' + data.total + ' cards. Great job!';
    } else if (mode === 'quiz') {
      var pct = Math.round((data.score / data.total) * 100);
      title = '❓ Quiz Complete!';
      scoreText = data.score + ' / ' + data.total + ' (' + pct + '%)';
      if (pct >= 90) details = '🌟 Excellent! You really know this material!';
      else if (pct >= 70) details = '👍 Good job! Keep practicing to improve.';
      else if (pct >= 50) details = '📚 Getting there! Review the cards you missed.';
      else details = '💪 Keep studying! You\'ll get there.';
    } else if (mode === 'match') {
      title = '🔗 Match Complete!';
      scoreText = data.total + ' pairs in ' + data.time + 's';
      if (data.time < 15) details = '⚡ Lightning fast!';
      else if (data.time < 30) details = '🔥 Great speed!';
      else details = '👍 All matched! Try to beat your time.';
    } else if (mode === 'write') {
        var pct2 = Math.round((data.score / data.total) * 100);
        title = '🗣️ Recall Complete!';
        scoreText = data.score + ' / ' + data.total + ' (' + pct2 + '%)';
        if (pct2 >= 90) details = '🌟 Outstanding recall!';
        else if (pct2 >= 70) details = '👍 Solid knowledge!';
        else details = '📚 Keep practicing your recall.';
    }

    document.getElementById('results-title').textContent = title;
    document.getElementById('results-score').textContent = scoreText;
    document.getElementById('results-details').textContent = details;
  }

  /* Results click handlers */
  document.getElementById('results-retry-btn').addEventListener('click', function () { startMode(currentMode); });
  document.getElementById('results-modes-btn').addEventListener('click', function () { showScreen(modeScreen); });
  document.getElementById('results-sets-btn').addEventListener('click', function () { showScreen(selectScreen); });

  /* ═══════════════════════════════════════
     GAZE + SCROLL
     ═══════════════════════════════════════ */
  function handleScrollGaze(x, y) {
    var grid = document.getElementById('select-grid');
    if (grid && grid.offsetParent !== null) {
      var r = grid.getBoundingClientRect();
      var zone = 80;
      if (x >= r.left && x <= r.right) {
        if (y >= r.top && y <= r.top + zone) grid.scrollTop -= 4;
        else if (y >= r.bottom - zone && y <= r.bottom) grid.scrollTop += 4;
      }
    }
  }

  onGaze(function (x, y) {
    handleScrollGaze(x, y);

    if (quizScreen.classList.contains('active')) handleQuizGaze(x, y);
    if (matchScreen.classList.contains('active')) handleMatchGaze(x, y);
    if (writeScreen.classList.contains('active')) handleWriteGaze(x, y);

    activeDwellButtons.forEach(function (b) { b.update(x, y); });
    if (window.updateChatbotDwell) {
        window.updateChatbotDwell(x, y);
    }
  });

  /* ═══════════════════════════════════════
     BOOT
     ═══════════════════════════════════════ */
  loadSets();
  bootWebGazer();
});