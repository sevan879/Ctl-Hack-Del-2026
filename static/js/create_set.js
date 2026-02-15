console.log('[create_set] Script loaded');

/* Wait for DOM to be fully ready */
document.addEventListener('DOMContentLoaded', function () {
  console.log('[create_set] DOM ready, setting up...');

  var cardsList = document.getElementById('cards-list');
  var cardsWrapper = document.getElementById('cards-wrapper');
  var addCardBtn = document.getElementById('add-card-btn');
  var saveSetBtn = document.getElementById('save-set-btn');
  var cardCountEl = document.getElementById('card-count');
  var setTitleInput = document.getElementById('set-title');
  var setDescInput = document.getElementById('set-description');

  /* Debug: check all elements found */
  console.log('[create_set] Elements:', {
    cardsList: !!cardsList,
    cardsWrapper: !!cardsWrapper,
    addCardBtn: !!addCardBtn,
    saveSetBtn: !!saveSetBtn,
    cardCountEl: !!cardCountEl,
    setTitleInput: !!setTitleInput,
    setDescInput: !!setDescInput,
  });

  var activeDwellButtons = [];
  var cardIdCounter = 0;

  /* ── Card Management ── */
  function createCard(term, definition) {
    term = term || '';
    definition = definition || '';
    cardIdCounter++;
    console.log('[create_set] Creating card #' + cardIdCounter);

    var card = document.createElement('div');
    card.className = 'card-entry';
    card.dataset.id = cardIdCounter;
    var num = document.querySelectorAll('.card-entry').length + 1;

    card.innerHTML =
      '<div class="card-number">' + num + '</div>' +
      '<div class="card-fields">' +
        '<div class="field-group">' +
          '<label>Term</label>' +
          '<textarea class="term-input gaze-textarea" placeholder="Enter term or question">' + term + '</textarea>' +
        '</div>' +
        '<div class="field-group">' +
          '<label>Definition</label>' +
          '<textarea class="definition-input gaze-textarea" placeholder="Enter definition or answer">' + definition + '</textarea>' +
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

    card.querySelectorAll('textarea').forEach(function (ta) {
      ta.addEventListener('input', function () {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
      });
    });

    updateCardCount();
    rebuildDwellButtons();
    cardsWrapper.scrollTop = cardsWrapper.scrollHeight;
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

  /* ── Save ── */
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

  /* ── Toast ── */
  function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  /* ── Dwell Wiring ── */
  function rebuildDwellButtons() {
    activeDwellButtons.forEach(function (b) { b.reset(); });
    activeDwellButtons = [];

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
  }

  /* ── Gaze helpers ── */
  function handleInputGaze(x, y) {
    document.querySelectorAll('.gaze-input, .gaze-textarea').forEach(function (input) {
      var r = input.getBoundingClientRect();
      var pad = 40;
      var inside = x >= r.left - pad && x <= r.right + pad &&
                   y >= r.top - pad && y <= r.bottom + pad;
      if (inside) {
        input.classList.add('gazing');
        input.focus();
      } else {
        input.classList.remove('gazing');
      }
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

  /* ── Click handlers ── */
  if (addCardBtn) {
    addCardBtn.addEventListener('click', function () {
      console.log('[create_set] Add card clicked');
      createCard();
    });
  }
  if (saveSetBtn) {
    saveSetBtn.addEventListener('click', function () {
      console.log('[create_set] Save clicked');
      saveSet();
    });
  }

  /* ── Register gaze callback ── */
  onGaze(function (x, y) {
    handleInputGaze(x, y);
    handleScrollGaze(x, y);
    activeDwellButtons.forEach(function (b) { b.update(x, y); });
  });

  /* ── Init ── */
  console.log('[create_set] Creating starter cards...');
  createCard();
  createCard();
  rebuildDwellButtons();

  console.log('[create_set] Booting WebGazer...');
  bootWebGazer();
});