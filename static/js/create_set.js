console.log('[create_set] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[create_set] DOM ready');

  var cardsList = document.getElementById('cards-list');
  var cardsWrapper = document.getElementById('cards-wrapper');
  var addCardBtn = document.getElementById('add-card-btn');
  var saveSetBtn = document.getElementById('save-set-btn');
  var cardCountEl = document.getElementById('card-count');
  var setTitleInput = document.getElementById('set-title');
  var setDescInput = document.getElementById('set-description');

  var activeDwellButtons = [];
  var voiceInputDwellButtons = [];
  var cardIdCounter = 0;

  var fieldRecognition = null;
  var fieldIsListening = false;
  var activeWrapper = null;
  var activeInput = null;
  var activeStatus = null;

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function stopFieldListening() {
    if (fieldRecognition && fieldIsListening) {
      try {
        fieldRecognition.stop();
      } catch (e) {}
    }
    fieldIsListening = false;
    if (activeWrapper) activeWrapper.classList.remove('listening');
    if (activeStatus) activeStatus.textContent = '';
    activeWrapper = null;
    activeInput = null;
    activeStatus = null;
    fieldRecognition = null;

    if (typeof resumeGlobalListening === 'function') {
      resumeGlobalListening();
    }
  }

  function startFieldListening(wrapper) {
    if (!SR) return;

    var input = wrapper.querySelector('input') || wrapper.querySelector('textarea');
    var status = wrapper.querySelector('.voice-status');

    if (!input) return;

    if (fieldIsListening && activeWrapper === wrapper) {
      stopFieldListening();
      return;
    }

    stopFieldListening();

    if (typeof pauseGlobalListening === 'function') {
      pauseGlobalListening();
    }

    fieldRecognition = new SR();
    fieldRecognition.continuous = false;
    fieldRecognition.interimResults = true;
    fieldRecognition.lang = 'en-US';
    fieldRecognition.maxAlternatives = 1;

    activeWrapper = wrapper;
    activeInput = input;
    activeStatus = status;
    fieldIsListening = true;

    var existingText = input.value || '';

    fieldRecognition.onstart = function () {
      wrapper.classList.add('listening');
      wrapper.classList.remove('gazing');
      if (status) status.textContent = '🎤 Listening...';
    };

    fieldRecognition.onresult = function (event) {
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
        var newText = existingText ? existingText + ' ' + finalTranscript.trim() : finalTranscript.trim();
        input.value = newText;
        if (input.tagName === 'TEXTAREA') {
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
        }
        if (status) status.textContent = '✅ Got it!';
      } else if (interimTranscript) {
        if (status) status.textContent = '🎤 ' + interimTranscript;
      }
    };

    fieldRecognition.onerror = function (event) {
      wrapper.classList.remove('listening');
      if (status) status.textContent = '❌ ' + event.error;
      fieldIsListening = false;
    };

    fieldRecognition.onend = function () {
      wrapper.classList.remove('listening');
      fieldIsListening = false;
      var w = wrapper;
      var s = status;
      setTimeout(function () {
        if (s && !fieldIsListening) s.textContent = '';
      }, 3000);

      voiceInputDwellButtons.forEach(function (b) {
        if (b.el === w) b.reset();
      });

      if (typeof resumeGlobalListening === 'function') {
        resumeGlobalListening();
      }
    };

    try {
      fieldRecognition.start();
    } catch (e) {
      fieldRecognition.stop();
      setTimeout(function () { fieldRecognition.start(); }, 100);
    }
  }

  function createCard(term, definition) {
    term = term || '';
    definition = definition || '';
    cardIdCounter++;

    var card = document.createElement('div');
    card.className = 'card-entry';
    card.dataset.id = cardIdCounter;
    var num = document.querySelectorAll('.card-entry').length + 1;

    card.innerHTML =
      '<div class="card-number">' + num + '</div>' +
      '<div class="card-fields">' +
        '<div class="field-group">' +
          '<label>Term</label>' +
          '<div class="voice-input-wrapper">' +
            '<textarea class="gaze-textarea term-input" placeholder="Look here to speak term...">' + term + '</textarea>' +
            '<div class="dwell-bar"><div class="dwell-fill"></div></div>' +
            '<div class="voice-status"></div>' +
          '</div>' +
        '</div>' +
        '<div class="field-group">' +
          '<label>Definition</label>' +
          '<div class="voice-input-wrapper">' +
            '<textarea class="gaze-textarea definition-input" placeholder="Look here to speak definition...">' + definition + '</textarea>' +
            '<div class="dwell-bar"><div class="dwell-fill"></div></div>' +
            '<div class="voice-status"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button class="delete-card-btn" title="Delete card">' +
        '🗑️' +
        '<div class="dwell-bar"><div class="dwell-fill"></div></div>' +
      '</button>';

    cardsList.appendChild(card);

    card.querySelector('.delete-card-btn').addEventListener('click', function () {
      deleteCard(card);
    });

    card.querySelectorAll('.voice-input-wrapper').forEach(function (wrapper) {
      wrapper.addEventListener('click', function () {
        startFieldListening(wrapper);
      });
    });

    card.querySelectorAll('textarea').forEach(function (ta) {
      ta.addEventListener('input', function () {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    });

    updateCardCount();
    rebuildDwellButtons();
    cardsWrapper.scrollTop = 0;
    return card;
  }

  function deleteCard(card) {
    if (document.querySelectorAll('.card-entry').length <= 1) {
      showToast('Need at least 1 card', 'error');
      return;
    }
    card.style.opacity = '0';
    card.style.transform = 'translateX(2rem)';
    card.style.transition = 'all 0.25s ease';
    setTimeout(function () {
      card.remove();
      renumberCards();
      updateCardCount();
      rebuildDwellButtons();
    }, 250);
  }

  function renumberCards() {
    document.querySelectorAll('.card-entry').forEach(function (c, i) {
      c.querySelector('.card-number').textContent = i + 1;
    });
  }

  function updateCardCount() {
    var n = document.querySelectorAll('.card-entry').length;
    cardCountEl.textContent = n + ' card' + (n !== 1 ? 's' : '');
  }

  function saveSet() {
    var title = setTitleInput.value.trim();
    if (!title) {
      showToast('Please enter a set title', 'error');
      setTitleInput.focus();
      return;
    }

    var cards = [];
    document.querySelectorAll('.card-entry').forEach(function (entry) {
      var term = entry.querySelector('.term-input').value.trim();
      var def = entry.querySelector('.definition-input').value.trim();
      if (term || def) cards.push({ term: term, definition: def });
    });

    if (cards.length === 0) {
      showToast('Add at least one card with content', 'error');
      return;
    }

    saveSetBtn.disabled = true;
    var label = saveSetBtn.querySelector('.action-label');
    if (label) label.textContent = 'Saving…';

    fetch('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        description: setDescInput.value.trim(),
        cards: cards,
        created_at: new Date().toISOString(),
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          showToast('✅ "' + title + '" saved — ' + cards.length + ' cards', 'success');
          setTimeout(function () { window.location.href = '/library'; }, 1800);
        } else {
          showToast('Error: ' + (data.error || 'Unknown'), 'error');
          resetSaveBtn();
        }
      })
      .catch(function (err) {
        showToast('Network error: ' + err.message, 'error');
        resetSaveBtn();
      });
  }

  function resetSaveBtn() {
    saveSetBtn.disabled = false;
    var label = saveSetBtn.querySelector('.action-label');
    if (label) label.textContent = 'Save Set';
  }

  function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  function rebuildDwellButtons() {
    activeDwellButtons.forEach(function (b) { b.reset(); });
    activeDwellButtons = [];
    voiceInputDwellButtons.forEach(function (b) { b.reset(); });
    voiceInputDwellButtons = [];

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

    if (addCardBtn) {
      activeDwellButtons.push(new DwellButton(addCardBtn, 1500, function () {
        createCard();
      }));
    }
    if (saveSetBtn) {
      activeDwellButtons.push(new DwellButton(saveSetBtn, 2000, function () {
        saveSet();
      }));
    }

    document.querySelectorAll('.delete-card-btn').forEach(function (btn) {
      var card = btn.closest('.card-entry');
      activeDwellButtons.push(new DwellButton(btn, 1500, function () {
        deleteCard(card);
      }));
    });

    document.querySelectorAll('.voice-input-wrapper').forEach(function (wrapper) {
      var dwellBtn = new DwellButton(wrapper, 2000, function () {
        startFieldListening(wrapper);
        setTimeout(function () { dwellBtn.reset(); }, 2500);
      });
      voiceInputDwellButtons.push(dwellBtn);
      activeDwellButtons.push(dwellBtn);
    });
  }

  function handleScrollGaze(x, y) {
    if (!cardsWrapper) return;
    var r = cardsWrapper.getBoundingClientRect();
    var zone = 80;
    if (x >= r.left && x <= r.right) {
      if (y >= r.top && y <= r.top + zone) cardsWrapper.scrollTop -= 4;
      else if (y >= r.bottom - zone && y <= r.bottom) cardsWrapper.scrollTop += 4;
    }
  }

  if (addCardBtn) {
    addCardBtn.addEventListener('click', function () {
      createCard();
    });
  }
  if (saveSetBtn) {
    saveSetBtn.addEventListener('click', function () {
      saveSet();
    });
  }

  document.querySelectorAll('.title-section .voice-input-wrapper').forEach(function (wrapper) {
    wrapper.addEventListener('click', function () {
      startFieldListening(wrapper);
    });
  });

  onGaze(function (x, y) {
    handleScrollGaze(x, y);
    activeDwellButtons.forEach(function (b) { b.update(x, y); });

    if (window.updateChatbotDwell) {
      window.updateChatbotDwell(x, y);
    }
  });

  createCard();
  createCard();
  rebuildDwellButtons();

  bootWebGazer();
});

