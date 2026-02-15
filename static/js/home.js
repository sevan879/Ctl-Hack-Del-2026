console.log('[home] Script loaded');

document.addEventListener('DOMContentLoaded', function () {
  console.log('[home] DOM ready');

  var DWELL_THRESHOLD = 1800;
  var activeDwellButtons = [];
  var dwellTarget = null;
  var dwellStart = 0;

  function resetDwellBars() {
    document.querySelectorAll('.mode-card .dwell-fill').forEach(function (f) {
      f.style.width = '0%';
    });
  }

  function handleGaze(x, y) {
    var cards = document.querySelectorAll('.mode-card');
    var gazedCard = null;

    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var pad = 60;
      var inside = x >= rect.left - pad && x <= rect.right + pad &&
                   y >= rect.top - pad && y <= rect.bottom + pad;
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
      var elapsed = Date.now() - dwellStart;
      var pct = Math.min((elapsed / DWELL_THRESHOLD) * 100, 100);
      var fill = gazedCard.querySelector('.dwell-fill');
      if (fill) fill.style.width = pct + '%';
      if (elapsed >= DWELL_THRESHOLD) {
        var href = gazedCard.getAttribute('data-href');
        if (href) window.location.href = href;
      }
    } else {
      dwellTarget = null;
      dwellStart = 0;
      resetDwellBars();
    }
  }

  function setupNavDwell() {
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
  }

  onGaze(function (x, y) {
    handleGaze(x, y);
    activeDwellButtons.forEach(function (b) { b.update(x, y); });
  });

  setupNavDwell();
  console.log('[home] Booting WebGazer...');
  bootWebGazer();
});