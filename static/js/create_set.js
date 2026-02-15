console.log('[create_set] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[create_set] DOM ready');

  var cardsList      = document.getElementById('cards-list');
  var cardsWrapper   = document.getElementById('cards-wrapper');
  var addCardBtn     = document.getElementById('add-card-btn');
  var saveSetBtn     = document.getElementById('save-set-btn');
  var cardCountEl    = document.getElementById('card-count');
  var setTitleInput  = document.getElementById('set-title');
  var setDescInput   = document.getElementById('set-description');

  var activeDwellButtons = [];
  var cardIdCounter = 0;

  /* ═══════════════════════════════════════
     VOICE — delegate entirely to shared.js
     ═══════════════════════════════════════ */

  // Activate voice for any voice-input-wrapper.
  // Uses the same switchToFieldMode that chatbox uses — continuous,
  // restarts automatically, stops on "EyeQ done".
  function startFieldListening(wrapper) {
    if (typeof switchToFieldMode !== 'function') return;

    // If already listening on this wrapper, toggle off
    if (voiceSystem && voiceSystem.mode === 'field' &&
        voiceSystem.activeWrapper === wrapper) {
      switchToGlobalMode();
      return;
    }

    var status = wrapper.querySelector('.voice-status');
    if (status) status.textContent = '🎤 Listening… say "EyeQ done" to finish';

    switchToFieldMode(wrapper, function () {
      // Called when the user says "EyeQ done" or recognition ends
      if (status) {
        status.textContent = '✅ Done!';
        setTimeout(function () { status.textContent = ''; }, 2000);
      }
      // Reset the dwell button so they can re-activate if needed
      rebuildDwellButtons();
    });
  }

  /* ═══════════════════════════════════════
     CARD MANAGEMENT
     ═══════════════════════════════════════ */
  function createCard(term, definition) {
    term       = term       || '';
    definition = definition || '';
    cardIdCounter++;

    var card = document.createElement('div');
    card.className  = 'card-entry';
    card.dataset.id = cardIdCounter;
    var num = document.querySelectorAll('.card-entry').length + 1;

    card.innerHTML =
      '<div class="card-number">' + num + '</div>' +
      '<div class="card-fields">' +
        '<div class="field-group">' +
          '<label>Term</label>' +
          '<div class="voice-input-wrapper">' +
            '<textarea class="gaze-textarea term-input"' +
              ' placeholder="Look here to speak term…">' + term + '</textarea>' +
            '<div class="dwell-bar"><div class="dwell-fill"></div></div>' +
            '<div class="voice-status"></div>' +
          '</div>' +
        '</div>' +
        '<div class="field-group">' +
          '<label>Definition</label>' +
          '<div class="voice-input-wrapper">' +
            '<textarea class="gaze-textarea definition-input"' +
              ' placeholder="Look here to speak definition…">' + definition + '</textarea>' +
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

    // Click on wrapper → start voice
    card.querySelectorAll('.voice-input-wrapper').forEach(function (wrapper) {
      wrapper.addEventListener('click', function () {
        startFieldListening(wrapper);
      });
    });

    // Delete button
    card.querySelector('.delete-card-btn').addEventListener('click', function () {
      deleteCard(card);
    });

    // Auto-resize textareas on manual input
    card.querySelectorAll('textarea').forEach(function (ta) {
      ta.addEventListener('input', function () {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    });

    updateCardCount();
    rebuildDwellButtons();
    // Scroll new card into view
    setTimeout(function () {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return card;
  }

  function deleteCard(card) {
    if (document.querySelectorAll('.card-entry').length <= 1) {
      showToast('Need at least 1 card', 'error');
      return;
    }
    // If we're currently listening on a field in this card, stop
    if (voiceSystem && voiceSystem.activeWrapper &&
        card.contains(voiceSystem.activeWrapper)) {
      if (typeof switchToGlobalMode === 'function') switchToGlobalMode();
    }
    card.style.opacity   = '0';
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

  /* ═══════════════════════════════════════
     SAVE
     ═══════════════════════════════════════ */
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
      var def  = entry.querySelector('.definition-input').value.trim();
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
        title:       title,
        description: setDescInput.value.trim(),
        cards:       cards,
        created_at:  new Date().toISOString(),
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

  /* ═══════════════════════════════════════
     TOAST
     ═══════════════════════════════════════ */
  function showToast(message, type) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className   = 'toast ' + (type || 'info') + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  /* ═══════════════════════════════════════
     DWELL BUTTONS
     ═══════════════════════════════════════ */
  function rebuildDwellButtons() {
    activeDwellButtons.forEach(function (b) { b.reset(); });
    activeDwellButtons = [];

    var homeBtn      = document.getElementById('home-btn');
    var calibrateBtn = document.getElementById('calibrate-btn');

    if (homeBtn)
      activeDwellButtons.push(new DwellButton(homeBtn, 1500, function () {
        window.location.href = '/';
      }));

    if (calibrateBtn)
      activeDwellButtons.push(new DwellButton(calibrateBtn, 1500, function () {
        forceRecalibrate();
      }));

    if (addCardBtn)
      activeDwellButtons.push(new DwellButton(addCardBtn, 1500, function () {
        createCard();
      }));

    if (saveSetBtn)
      activeDwellButtons.push(new DwellButton(saveSetBtn, 2000, function () {
        saveSet();
      }));

    // Delete buttons
    document.querySelectorAll('.delete-card-btn').forEach(function (btn) {
      var card = btn.closest('.card-entry');
      activeDwellButtons.push(new DwellButton(btn, 1500, function () {
        deleteCard(card);
      }));
    });

    // Voice input wrappers — gaze dwell activates voice
    document.querySelectorAll('.voice-input-wrapper').forEach(function (wrapper) {
      var dwellBtn = new DwellButton(wrapper, 1800, function () {
        startFieldListening(wrapper);
        // Reset after short delay so the fill clears
        setTimeout(function () { dwellBtn.reset(); }, 500);
      });
      activeDwellButtons.push(dwellBtn);
    });
  }

  /* ═══════════════════════════════════════
     GAZE SCROLL
     ═══════════════════════════════════════ */
  function handleScrollGaze(x, y) {
    if (!cardsWrapper) return;
    var r    = cardsWrapper.getBoundingClientRect();
    var zone = 80;
    if (x >= r.left && x <= r.right) {
      if (y >= r.top && y <= r.top + zone)          cardsWrapper.scrollTop -= 5;
      else if (y >= r.bottom - zone && y <= r.bottom) cardsWrapper.scrollTop += 5;
    }
  }

  /* ═══════════════════════════════════════
     CLICK HANDLERS (mouse / keyboard users)
     ═══════════════════════════════════════ */
  if (addCardBtn)  addCardBtn.addEventListener('click',  function () { createCard(); });
  if (saveSetBtn)  saveSetBtn.addEventListener('click',  function () { saveSet(); });

  // Title / description wrappers
  document.querySelectorAll('.title-section .voice-input-wrapper').forEach(function (wrapper) {
    wrapper.addEventListener('click', function () { startFieldListening(wrapper); });
  });

  /* ═══════════════════════════════════════
     GAZE LISTENER
     ═══════════════════════════════════════ */
  onGaze(function (x, y) {
    handleScrollGaze(x, y);
    activeDwellButtons.forEach(function (b) { b.update(x, y); });
    if (window.updateChatbotDwell) window.updateChatbotDwell(x, y);
  });

  /* ═══════════════════════════════════════
     INIT
     ═══════════════════════════════════════ */
  createCard();
  createCard();
  rebuildDwellButtons();
  bootWebGazer();
});