console.log('[library] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[library] DOM ready, setting up...');

  var setsGrid = document.getElementById('sets-grid');
  var loadingState = document.getElementById('loading-state');
  var emptyState = document.getElementById('empty-state');
  var setModal = document.getElementById('set-modal');
  var confirmModal = document.getElementById('confirm-modal');

  console.log('[library] Elements:', {
    setsGrid: !!setsGrid,
    loadingState: !!loadingState,
    emptyState: !!emptyState,
    setModal: !!setModal,
    confirmModal: !!confirmModal,
  });

  var activeDwellButtons = [];
  var allSets = [];
  var activeSetId = null;

  /* ── Helpers ── */
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch (e) { return ''; }
  }

  function pickIcon(title) {
    var t = (title || '').toLowerCase();
    if (t.indexOf('bio') !== -1) return '🧬';
    if (t.indexOf('chem') !== -1) return '⚗️';
    if (t.indexOf('phys') !== -1) return '⚛️';
    if (t.indexOf('math') !== -1) return '📐';
    if (t.indexOf('hist') !== -1) return '🏛️';
    if (t.indexOf('eng') !== -1) return '📖';
    if (t.indexOf('code') !== -1 || t.indexOf('python') !== -1 || t.indexOf('java') !== -1 || t.indexOf('program') !== -1) return '💻';
    if (t.indexOf('music') !== -1) return '🎵';
    if (t.indexOf('art') !== -1) return '🎨';
    if (t.indexOf('geo') !== -1) return '🌍';
    if (t.indexOf('lang') !== -1 || t.indexOf('spanish') !== -1 || t.indexOf('french') !== -1) return '🗣️';
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

  function showToast(message, type) {
    type = type || 'info';
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function () { toast.classList.remove('show'); }, 3500);
  }

  /* ── Fetch & Render ── */
  function loadSets() {
    console.log('[library] Fetching /api/sets...');

    fetch('/api/sets')
      .then(function (res) {
        console.log('[library] Response status:', res.status);
        return res.json();
      })
      .then(function (data) {
        console.log('[library] Got sets:', data.length);
        allSets = data;
        loadingState.style.display = 'none';

        if (allSets.length === 0) {
          emptyState.style.display = 'flex';
          setsGrid.style.display = 'none';
        } else {
          emptyState.style.display = 'none';
          setsGrid.style.display = 'grid';
          renderSets();
        }
        rebuildDwellButtons();
      })
      .catch(function (err) {
        console.error('[library] Fetch error:', err);
        loadingState.style.display = 'none';
        emptyState.style.display = 'flex';
        setsGrid.style.display = 'none';
        showToast('Failed to load sets: ' + err.message, 'error');
      });
  }

  function renderSets() {
    setsGrid.innerHTML = '';

    allSets.forEach(function (set, i) {
      var card = document.createElement('div');
      card.className = 'set-card';
      card.dataset.id = set.id;
      card.style.animationDelay = (i * 0.06) + 's';

      var count = set.card_count || (set.cards ? set.cards.length : 0);
      card.innerHTML =
        '<div class="set-card-icon">' + pickIcon(set.title) + '</div>' +
        '<div class="set-card-title">' + escapeHtml(set.title) + '</div>' +
        '<div class="set-card-desc">' + escapeHtml(set.description || 'No description') + '</div>' +
        '<div class="set-card-meta">' +
          '<span class="set-card-count">🃏 ' + count + ' card' + (count !== 1 ? 's' : '') + '</span>' +
          '<span class="set-card-date">' + formatDate(set.created_at) + '</span>' +
        '</div>' +
        '<div class="dwell-bar"><div class="dwell-fill"></div></div>';

      card.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        openSetModal(set.id);
      });
      setsGrid.appendChild(card);
    });

    var createCard = document.createElement('div');
    createCard.style.cursor = 'pointer';
    createCard.addEventListener('click', function (e) {
      e.stopPropagation();
      window.location.href = '/create-set';
    });
    createCard.className = 'create-card';
    createCard.id = 'grid-create-btn';
    createCard.innerHTML =
      '<div class="create-card-icon">➕</div>' +
      '<div class="create-card-text">Create New Set</div>' +
      '<div class="dwell-bar"><div class="dwell-fill"></div></div>';
    setsGrid.appendChild(createCard);
  }

  /* ── Set Detail Modal ── */
  function openSetModal(setId) {
    var set = null;
    for (var i = 0; i < allSets.length; i++) {
      if (allSets[i].id === setId) { set = allSets[i]; break; }
    }
    if (!set) return;
    activeSetId = setId;

    document.getElementById('modal-title').textContent = set.title;
    document.getElementById('modal-description').textContent = set.description || 'No description';

    var count = set.cards ? set.cards.length : 0;
    document.getElementById('modal-meta').innerHTML =
      '<span>🃏 ' + count + ' card' + (count !== 1 ? 's' : '') + '</span>' +
      '<span>📅 ' + formatDate(set.created_at) + '</span>';
    document.getElementById('modal-card-count').textContent =
      count + ' card' + (count !== 1 ? 's' : '');

    var list = document.getElementById('modal-cards-list');
    list.innerHTML = '';

    if (set.cards && set.cards.length > 0) {
      set.cards.forEach(function (c, idx) {
        var item = document.createElement('div');
        item.className = 'modal-card-item';
        item.innerHTML =
          '<div class="modal-card-num">' + (idx + 1) + '</div>' +
          '<div class="modal-card-content">' +
            '<div class="modal-card-term">' + escapeHtml(c.term || '') + '</div>' +
            '<div class="modal-card-divider"></div>' +
            '<div class="modal-card-def">' + escapeHtml(c.definition || '') + '</div>' +
          '</div>';
        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<p style="color:#555;text-align:center;padding:1rem;">No cards</p>';
    }

    document.getElementById('modal-study-btn').href = '/practice?set=' + setId;
    setModal.style.display = 'flex';
    rebuildDwellButtons();
  }

  function closeSetModal() {
    setModal.style.display = 'none';
    activeSetId = null;
    rebuildDwellButtons();
  }

  function openConfirmDelete() {
    var set = null;
    for (var i = 0; i < allSets.length; i++) {
      if (allSets[i].id === activeSetId) { set = allSets[i]; break; }
    }
    if (!set) return;

    document.getElementById('confirm-text').textContent =
      '"' + set.title + '" and all its cards will be permanently removed.';
    setModal.style.display = 'none';
    confirmModal.style.display = 'flex';
    rebuildDwellButtons();
  }

  function closeConfirmDelete() {
    confirmModal.style.display = 'none';
    rebuildDwellButtons();
  }

  function deleteSet() {
    if (!activeSetId) return;

    fetch('/api/sets/' + activeSetId, { method: 'DELETE' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          showToast('Set deleted', 'success');
          confirmModal.style.display = 'none';
          activeSetId = null;
          loadSets();
        } else {
          showToast('Error: ' + (data.error || 'Unknown'), 'error');
        }
      })
      .catch(function (err) {
        showToast('Network error: ' + err.message, 'error');
      });
  }

  /* ── Gaze scroll ── */
  function handleScrollGaze(x, y) {
    var containers = [setsGrid, document.getElementById('modal-cards-list')];
    containers.forEach(function (el) {
      if (!el || el.offsetParent === null) return;
      var r = el.getBoundingClientRect();
      var zone = 80;
      if (x >= r.left && x <= r.right) {
        if (y >= r.top && y <= r.top + zone) el.scrollTop -= 4;
        else if (y >= r.bottom - zone && y <= r.bottom) el.scrollTop += 4;
      }
    });
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

    var emptyCta = document.getElementById('empty-create-btn');
    if (emptyCta && emptyState && emptyState.style.display !== 'none') {
      activeDwellButtons.push(new DwellButton(emptyCta, 1500, function () {
        window.location.href = '/create-set';
      }));
    }

    document.querySelectorAll('.set-card').forEach(function (card) {
      activeDwellButtons.push(new DwellButton(card, 1800, function () {
        openSetModal(card.dataset.id);
      }));
    });

    var gridCreate = document.getElementById('grid-create-btn');
    if (gridCreate) {
      activeDwellButtons.push(new DwellButton(gridCreate, 1500, function () {
        window.location.href = '/create-set';
      }));
    }

    if (setModal && setModal.style.display === 'flex') {
      var closeBtn = document.getElementById('modal-close-btn');
      var studyBtn = document.getElementById('modal-study-btn');
      var deleteBtn = document.getElementById('modal-delete-btn');

      if (closeBtn) activeDwellButtons.push(new DwellButton(closeBtn, 1200, closeSetModal));
      if (studyBtn) activeDwellButtons.push(new DwellButton(studyBtn, 1500, function () {
        window.location.href = studyBtn.href;
      }));
      if (deleteBtn) activeDwellButtons.push(new DwellButton(deleteBtn, 2000, openConfirmDelete));
    }

    if (confirmModal && confirmModal.style.display === 'flex') {
      var yesBtn = document.getElementById('confirm-yes-btn');
      var noBtn = document.getElementById('confirm-no-btn');
      if (yesBtn) activeDwellButtons.push(new DwellButton(yesBtn, 2000, deleteSet));
      if (noBtn) activeDwellButtons.push(new DwellButton(noBtn, 1200, closeConfirmDelete));
    }
  }

  /* ── Click handlers ── */
  var modalCloseBtn = document.getElementById('modal-close-btn');
  var modalDeleteBtn = document.getElementById('modal-delete-btn');
  var confirmYesBtn = document.getElementById('confirm-yes-btn');
  var confirmNoBtn = document.getElementById('confirm-no-btn');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSetModal);
  if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', openConfirmDelete);
  if (confirmYesBtn) confirmYesBtn.addEventListener('click', deleteSet);
  if (confirmNoBtn) confirmNoBtn.addEventListener('click', closeConfirmDelete);

  if (setModal) {
    setModal.addEventListener('click', function (e) {
      if (e.target === setModal) closeSetModal();
    });
  }
  if (confirmModal) {
    confirmModal.addEventListener('click', function (e) {
      if (e.target === confirmModal) closeConfirmDelete();
    });
  }

  /* ── Register gaze callback ── */
  onGaze(function (x, y) {
    handleScrollGaze(x, y);
    activeDwellButtons.forEach(function (b) { b.update(x, y); });

    if (window.updateChatbotDwell) {
      window.updateChatbotDwell(x, y);
    }
  });

  /* ── Init ── */
  console.log('[library] Loading sets...');
  loadSets();

  console.log('[library] Booting WebGazer...');
  bootWebGazer();
});