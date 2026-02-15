window.alert = function () {};

class GazeSmoother {
  constructor() {
    this.smoothX = null;
    this.smoothY = null;
    this.lastRawX = 0;
    this.lastRawY = 0;
    this.lastTime = Date.now();
    this.history = [];
    this.HISTORY_SIZE = 15;
  }

  update(rawX, rawY) {
    var now = Date.now();
    var dt = Math.max(now - this.lastTime, 1);
    var vx = Math.abs(rawX - this.lastRawX) / dt;
    var vy = Math.abs(rawY - this.lastRawY) / dt;
    var speed = Math.sqrt(vx * vx + vy * vy);
    var alpha = Math.min(0.6, Math.max(0.1, speed * 2));

    if (this.smoothX === null) {
      this.smoothX = rawX;
      this.smoothY = rawY;
    } else {
      this.smoothX = alpha * rawX + (1 - alpha) * this.smoothX;
      this.smoothY = alpha * rawY + (1 - alpha) * this.smoothY;
    }

    this.history.push({ x: rawX, y: rawY });
    if (this.history.length > this.HISTORY_SIZE) this.history.shift();

    if (this.history.length >= 5) {
      var medX = this.median(this.history.map(function (p) { return p.x; }));
      var medY = this.median(this.history.map(function (p) { return p.y; }));
      if (Math.sqrt((rawX - medX) * (rawX - medX) + (rawY - medY) * (rawY - medY)) > 200) {
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
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
}

class DwellButton {
  constructor(el, dwellTime, onActivate) {
    this.el = el;
    this.dwellTime = dwellTime || 2000;
    this.onActivate = onActivate;
    this.isGazing = false;
    this.startTime = 0;
    this.activated = false;

    // Look for existing dwell-fill first
    this.fill = this.el.querySelector('.dwell-fill');
    
    // If no fill exists, create the whole dwell bar structure
    if (!this.fill) {
      var bar = document.createElement('div');
      bar.className = 'dwell-bar';
      bar.innerHTML = '<div class="dwell-fill"></div>';
      this.el.appendChild(bar);
      this.fill = this.el.querySelector('.dwell-fill');
    }
  }

  update(gx, gy) {
    if (this.activated) return;
    
    var r = this.el.getBoundingClientRect();
    var pad = 60;
    var inside =
      gx >= r.left - pad && gx <= r.right + pad &&
      gy >= r.top - pad && gy <= r.bottom + pad;

    if (inside) {
      if (!this.isGazing) {
        this.isGazing = true;
        this.startTime = Date.now();
        this.el.classList.add('gazing');
      }
      var pct = Math.min(((Date.now() - this.startTime) / this.dwellTime) * 100, 100);
      
      if (this.fill) {
        if (this.el.classList.contains('chatbox-trigger')) {
          this.fill.style.height = pct + '%';
        } else {
          this.fill.style.width = pct + '%';
        }
      }
      if (Date.now() - this.startTime >= this.dwellTime) {
        this.activated = true;
        if (this.fill) {
          if (this.el.classList.contains('chatbox-trigger')) {
            this.fill.style.height = '100%';
          } else {
            this.fill.style.width = '100%';
          }
        }
        if (this.onActivate) this.onActivate();
      }
    } else {
      this.isGazing = false;
      this.startTime = 0;
      if (this.fill) {
        this.fill.style.width = '0%';
      }
      this.el.classList.remove('gazing');
    }
  }

  reset() {
    this.activated = false;
    this.isGazing = false;
    this.startTime = 0;
    if (this.fill) {
      this.fill.style.width = '0%';
    }
    this.el.classList.remove('gazing');
  }
}

function CalibrationSystem(onComplete) {
  this.onComplete = onComplete;
  this.isRunning  = false;
  this.isFirstTime = localStorage.getItem('eyeq_calibrated') !== 'true';

  // Fewer, better-distributed points — corners removed entirely.
  // WebGazer ridge regression needs DENSITY near centre, not extremes.
  this.pointPositions = [
    // Row 1
    { x: 15, y: 15 }, { x: 50, y: 10 }, { x: 85, y: 15 },
    // Row 2
    { x: 20, y: 38 }, { x: 50, y: 35 }, { x: 80, y: 38 },
    // Row 3 (centre band — most important)
    { x: 15, y: 50 }, { x: 35, y: 50 }, { x: 50, y: 50 }, { x: 65, y: 50 }, { x: 85, y: 50 },
    // Row 4
    { x: 20, y: 62 }, { x: 50, y: 65 }, { x: 80, y: 62 },
    // Row 5
    { x: 15, y: 82 }, { x: 50, y: 85 }, { x: 85, y: 82 },
  ];

  this.currentPointIndex = 0;
  this.currentRound      = 0;
  this.totalRounds       = 3;
  this.dotSizes          = [90, 60, 38];

  // How long to show each dot while continuously recording
  this.timePerPoint      = 2500;   // ms per dot
  // How frequently to call recordScreenPosition
  this.recordInterval    = 80;     // ms  (~12 samples/sec)

  this._recordTimer  = null;   // setInterval handle for recording
  this._advanceTimer = null;   // setTimeout handle for next dot
  this._gazeCallback = null;   // onGaze handle for cleanup
}

// ── createUI ──────────────────────────────────────────────────
CalibrationSystem.prototype.createUI = function () {
  this.overlay = document.createElement('div');
  this.overlay.id = 'cal-overlay';
  this.overlay.innerHTML =
    '<div id="cal-instruction">' +
      '<h2 id="cal-title">Calibration</h2>' +
      '<p id="cal-subtitle"></p>' +
    '</div>' +
    '<div id="cal-dot-container">' +
      '<div id="cal-ring"></div>' +
      '<div id="cal-dot"></div>' +
    '</div>' +
    '<div id="cal-progress-container">' +
      '<div id="cal-progress-bar"></div>' +
    '</div>' +
    '<p id="cal-counter"></p>' +
    '<button id="cal-skip-btn" style="display:flex!important">' +
      '⏭️ Skip Calibration' +
      '<div class="dwell-bar"><div class="dwell-fill"></div></div>' +
    '</button>';
  document.body.appendChild(this.overlay);

  this.dot         = document.getElementById('cal-dot');
  this.ring        = document.getElementById('cal-ring');
  this.label       = document.getElementById('cal-title');
  this.subtitle    = document.getElementById('cal-subtitle');
  this.counter     = document.getElementById('cal-counter');
  this.progressBar = document.getElementById('cal-progress-bar');

  var self    = this;
  var skipBtn = document.getElementById('cal-skip-btn');

  skipBtn.addEventListener('click', function () { self.skip(); });

  this.skipDwellBtn = new DwellButton(skipBtn, 1500, function () {
    self.skip();
  });

  // Single gaze callback: just drives the skip button dwell.
  // Recording is done via a timed interval — no gaze needed.
  this._gazeCallback = function (x, y) {
    if (!self.isRunning) return;
    self.skipDwellBtn.update(x, y);
  };
  onGaze(this._gazeCallback);
};

// ── start ─────────────────────────────────────────────────────
CalibrationSystem.prototype.start = function () {
  _calibrationActive = true;
  this.createUI();
  this.isRunning         = true;
  this.currentRound      = 0;
  this.currentPointIndex = 0;
  this.dot.style.display  = 'none';
  this.ring.style.display = 'none';

  if (this.isFirstTime) {
    this.showIntroSequence();
  } else {
    this.showGetReady();
  }
};

// ── showIntroSequence ─────────────────────────────────────────
CalibrationSystem.prototype.showIntroSequence = function () {
  var self = this;

  this.label.textContent = '👁️ Eye Tracking Calibration';
  this.subtitle.innerHTML =
    'Welcome to EyeQ!<br><br>' +
    '<strong>Just look at each dot as it appears.</strong><br>' +
    'You don\'t need to click or hold — simply look at it naturally ' +
    'and it will move on its own. The more naturally you look, ' +
    'the better the calibration.';

  setTimeout(function () {
    self.label.textContent = '💡 Tips for Best Results';
    self.subtitle.innerHTML =
      '• Sit at a comfortable distance — about arm\'s length<br>' +
      '• Make sure your face is well-lit (light in front of you, not behind)<br>' +
      '• Keep your <strong>head still</strong> — move only your eyes<br>' +
      '• Look at the <strong>centre</strong> of each dot<br>' +
      '• Wear your glasses if you normally use them';
  }, 7000);

  setTimeout(function () { self.showGetReady(); }, 14000);
};

// ── showGetReady ──────────────────────────────────────────────
CalibrationSystem.prototype.showGetReady = function () {
  var self = this;
  this.label.textContent    = 'Get Ready';
  this.subtitle.textContent = 'Position your face in the webcam preview — centre and well-lit';
  this.counter.textContent  = 'Starting in 3…';

  setTimeout(function () { self.counter.textContent = 'Starting in 2…'; }, 1000);
  setTimeout(function () { self.counter.textContent = 'Starting in 1…'; }, 2000);
  setTimeout(function () { self.startRound(); },                           3000);
};

// ── startRound ────────────────────────────────────────────────
CalibrationSystem.prototype.startRound = function () {
  this.shuffledPoints    = this.shuffleArray([].concat(this.pointPositions));
  this.currentPointIndex = 0;

  this.label.textContent    = 'Round ' + (this.currentRound + 1) + ' of ' + this.totalRounds;
  this.subtitle.textContent = 'Follow each dot with your eyes — it moves automatically';

  this._updateProgress();

  this.dot.style.display  = 'block';
  this.ring.style.display = 'block';
  this.showPoint();
};

// ── showPoint ─────────────────────────────────────────────────
CalibrationSystem.prototype.showPoint = function () {
  // Clear any running timers from the previous point
  if (this._recordTimer)  { clearInterval(this._recordTimer);  this._recordTimer  = null; }
  if (this._advanceTimer) { clearTimeout(this._advanceTimer);  this._advanceTimer = null; }

  if (this.currentPointIndex >= this.shuffledPoints.length) {
    this.currentRound++;
    if (this.currentRound >= this.totalRounds) {
      this.complete();
      return;
    }
    // Brief inter-round pause
    this.dot.style.display  = 'none';
    this.ring.style.display = 'none';
    this.label.textContent    = 'Round ' + this.currentRound + ' Complete! ✅';
    this.subtitle.textContent = 'Great — next round uses smaller dots for finer accuracy';
    var self = this;
    setTimeout(function () { self.startRound(); }, 2000);
    return;
  }

  var pos     = this.shuffledPoints[this.currentPointIndex];
  var size    = this.dotSizes[this.currentRound];
  var screenX = (pos.x / 100) * window.innerWidth;
  var screenY = (pos.y / 100) * window.innerHeight;

  // ── Position dot ──
  this.dot.style.width  = size + 'px';
  this.dot.style.height = size + 'px';
  this.dot.style.left   = screenX + 'px';
  this.dot.style.top    = screenY + 'px';
  // Reset dot colour
  this.dot.style.background =
    'radial-gradient(circle, #4f46e5 40%, #6366f1 70%, transparent 71%)';

  // ── Position ring and restart animation ──
  var ringSize = size + 24;
  this.ring.style.width  = ringSize + 'px';
  this.ring.style.height = ringSize + 'px';
  this.ring.style.left   = screenX + 'px';
  this.ring.style.top    = screenY + 'px';
  this.ring.style.animation = 'none';
  this.ring.offsetHeight;  // force reflow
  this.ring.style.animation = 'ring-fill ' + this.timePerPoint + 'ms linear forwards';

  // ── Update counter / progress ──
  this.counter.textContent = 'Point ' + (this.currentPointIndex + 1) +
                             ' of '   + this.shuffledPoints.length;
  this._updateProgress();

  // ── Continuously record gaze at this dot's screen position ──
  // WebGazer's ridge regression learns from every call — more = better.
  var self = this;
  this._recordTimer = setInterval(function () {
    self._recordSample(screenX, screenY);
  }, this.recordInterval);

  // ── Advance to next dot after timePerPoint ──
  this._advanceTimer = setTimeout(function () {
    clearInterval(self._recordTimer);
    self._recordTimer = null;

    // Green flash to signal success
    if (self.dot) {
      self.dot.style.background =
        'radial-gradient(circle, #10b981 40%, #34d399 70%, transparent 71%)';
    }
    setTimeout(function () {
      self.currentPointIndex++;
      self.showPoint();
    }, 250);
  }, this.timePerPoint);
};

// ── _recordSample — the key fix: use the real WebGazer API ────
CalibrationSystem.prototype._recordSample = function (x, y) {
  try {
    if (typeof webgazer !== 'undefined' && webgazer.recordScreenPosition) {
      webgazer.recordScreenPosition(x, y, 'click');
    }
  } catch (e) {}
};

// ── _updateProgress ───────────────────────────────────────────
CalibrationSystem.prototype._updateProgress = function () {
  var totalPoints  = this.totalRounds * this.pointPositions.length;
  var donePts      = this.currentRound * this.pointPositions.length +
                     this.currentPointIndex;
  this.progressBar.style.width = ((donePts / totalPoints) * 100) + '%';
};

// ── complete ──────────────────────────────────────────────────
CalibrationSystem.prototype.complete = function () {
  _calibrationActive = false;
  this.isRunning = false;
  this._cleanup();

  this.progressBar.style.width  = '100%';
  this.label.textContent        = '✅ Calibration Complete!';
  this.subtitle.textContent     = 'Eye tracking is now active. It will keep improving as you use the app.';
  this.dot.style.display        = 'none';
  this.ring.style.display       = 'none';
  this.counter.textContent      = '';

  var wasFirstTime = this.isFirstTime;
  localStorage.setItem('eyeq_calibrated', 'true');
  _isCalibrated = true;

  var self = this;
  setTimeout(function () {
    self.overlay.remove();
    if (wasFirstTime) {
      initGuidedTour(self.onComplete);
    } else if (self.onComplete) {
      self.onComplete();
    }
  }, 1800);
};

// ── skip ──────────────────────────────────────────────────────
CalibrationSystem.prototype.skip = function () {
  _calibrationActive = false;
  var wasFirstTime = this.isFirstTime;
  this.isRunning = false;
  this._cleanup();
  this.overlay.remove();
  localStorage.setItem('eyeq_calibrated', 'true');
  _isCalibrated = true;

  if (wasFirstTime) {
    initGuidedTour(this.onComplete);
  } else if (this.onComplete) {
    this.onComplete();
  }
};

// ── _cleanup ──────────────────────────────────────────────────
CalibrationSystem.prototype._cleanup = function () {
  if (this._recordTimer)  { clearInterval(this._recordTimer);  this._recordTimer  = null; }
  if (this._advanceTimer) { clearTimeout(this._advanceTimer);  this._advanceTimer = null; }
  if (this._gazeCallback) {
    var idx = _gazeCallbacks.indexOf(this._gazeCallback);
    if (idx > -1) _gazeCallbacks.splice(idx, 1);
    this._gazeCallback = null;
  }
};

// ── shuffleArray ──────────────────────────────────────────────
CalibrationSystem.prototype.shuffleArray = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j    = Math.floor(Math.random() * (i + 1));
    var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
  }
  return arr;
};


var _sharedSmoother = new GazeSmoother();
var _gazeCallbacks = [];
var _isCalibrated = localStorage.getItem('eyeq_calibrated') === 'true';
var _webgazerBooted = false;
var _calibrationActive = false;

function onGaze(callback) {
  _gazeCallbacks.push(callback);
}

function snapToTargetGlobal(x, y) {
  if (_calibrationActive) return { x: x, y: y };
  if (guidedTour.active) return { x: x, y: y };
  var selectors = [
    '.mode-card', '.set-card', '.create-card', '.option',
    '.action-btn', '.delete-card-btn', '.modal-btn', '.modal-close',
    '.empty-cta', '.home-button', '.calibrate-btn',
    '#start-btn', '#next-btn', '#restart-btn',
    '.gaze-input', '.gaze-textarea', '.field-group textarea', '#topic-input',
    '#tour-tooltip', '#tour-skip-btn', '#cal-skip-btn'
  ];
  var targets = document.querySelectorAll(selectors.join(', '));
  var closest = null;
  var closestDist = 150;

  targets.forEach(function (t) {
    var r = t.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
    if (d < closestDist) {
      closestDist = d;
      closest = { x: cx, y: cy };
    }
  });
  return closest || { x: x, y: y };
}


function bootWebGazer() {
  if (_webgazerBooted) return;
  _webgazerBooted = true;

  if (typeof webgazer === 'undefined') {
    console.error('[shared] webgazer is undefined');
    return;
  }

  var gazeDot = document.getElementById('gaze-dot');

  try {
    webgazer.setRegression('ridge');
    webgazer.showVideoPreview(true);
    webgazer.showPredictionPoints(false);
    webgazer.showFaceOverlay(true);
    webgazer.showFaceFeedbackBox(false);

    webgazer.setGazeListener(function (data) {
      if (!data) return;

      var pt = _sharedSmoother.update(data.x, data.y);
      pt = snapToTargetGlobal(pt.x, pt.y);

      if (gazeDot) {
        gazeDot.style.display = 'block';
        gazeDot.style.left = pt.x + 'px';
        gazeDot.style.top = pt.y + 'px';
      }

      if (_isCalibrated) {
        for (var i = 0; i < _gazeCallbacks.length; i++) {
          try { _gazeCallbacks[i](pt.x, pt.y); }
          catch (err) {}
        }
      }
    });

    // Create the fixed wrapper that will hold all WebGazer visual elements
    var camWrapper = document.createElement('div');
    camWrapper.id = 'webgazer-cam-wrapper';
    document.body.appendChild(camWrapper);

    // Move all WebGazer visual elements into the wrapper.
    // Returns true when at least video + one canvas are captured.
    function captureWebGazerElements() {
      var captured = 0;
      var ids = ['webgazerVideoFeed', 'webgazerVideoCanvas', 'webgazerFaceOverlay'];
      ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          if (el.parentElement !== camWrapper) camWrapper.appendChild(el);
          captured++;
        }
      });
      // Also pull canvases out of WebGazer's own container
      var container = document.getElementById('webgazerVideoContainer');
      if (container) {
        var children = Array.prototype.slice.call(container.children);
        children.forEach(function(child) {
          if (child.tagName === 'CANVAS' || child.tagName === 'VIDEO') {
            if (child.parentElement !== camWrapper) {
              camWrapper.appendChild(child);
              captured++;
            }
          }
        });
      }
      return captured >= 2; // video + at least one canvas
    }

    // MutationObserver to grab elements as WebGazer creates them
    var observer = new MutationObserver(function() {
      if (captureWebGazerElements()) {
        observer.disconnect(); // stop observing once we have everything
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    webgazer.begin()
      .then(function () {
        // Capture immediately, then keep checking briefly for stragglers
        if (!captureWebGazerElements()) {
          var checkCount = 0;
          var checkInterval = setInterval(function() {
            if (captureWebGazerElements() || ++checkCount >= 15) {
              clearInterval(checkInterval);
              observer.disconnect();
            }
          }, 200);
        } else {
          observer.disconnect();
        }

        if (!_isCalibrated) {
          var cal = new CalibrationSystem(function () {
            _isCalibrated = true;
          });
          cal.start();
        }
      })
      .catch(function (err) {
        console.error('[shared] webgazer.begin() failed:', err);
      });
  } catch (err) {
    console.error('[shared] WebGazer setup error:', err);
  }
}

function forceRecalibrate() {
  localStorage.removeItem('eyeq_calibrated');
  _isCalibrated = false;
  var cal = new CalibrationSystem(function () {
    _isCalibrated = true;
  });
  cal.start();
}

var _calBtn = document.getElementById('calibrate-btn');
if (_calBtn) {
  _calBtn.addEventListener('click', function () {
    forceRecalibrate();
  });
}

var voiceSystem = {
  recognition: null,
  listening: false,
  mode: 'global',
  activeWrapper: null,
  activeInput: null,
  activeStatus: null,
  activeDwellBtn: null,
  existingText: '',
  onFieldComplete: null,
  paused: false,
  silenceTimer: null,
  SILENCE_DELAY: 2000 // 2 seconds of silence
};

function initVoiceSystem() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  voiceSystem.recognition = new SR();
  voiceSystem.recognition.continuous = true;
  voiceSystem.recognition.interimResults = true;
  voiceSystem.recognition.lang = 'en-US';
  voiceSystem.recognition.maxAlternatives = 1;

  voiceSystem.recognition.onstart = function () {
    voiceSystem.listening = true;
  };

  voiceSystem.recognition.onresult = function (event) {
    // Reset silence timer on any speech
    if (voiceSystem.silenceTimer) {
      clearTimeout(voiceSystem.silenceTimer);
    }

    for (var i = event.resultIndex; i < event.results.length; i++) {
      var transcript = event.results[i][0].transcript;
      var transcriptLower = transcript.toLowerCase().trim();
      var isFinal = event.results[i].isFinal;

      if (voiceSystem.mode === 'global') {
        if (isFinal) {
          handleGlobalCommand(transcriptLower);
        }
      } else if (voiceSystem.mode === 'field') {
        handleFieldInput(transcript, isFinal);
      }
    }

    // Start silence timer after speech stops
    if (voiceSystem.mode === 'field') {
      voiceSystem.silenceTimer = setTimeout(function() {
        // Auto-complete after silence
        if (voiceSystem.activeStatus) {
          voiceSystem.activeStatus.textContent = '✅ Done!';
        }
        switchToGlobalMode();
      }, voiceSystem.SILENCE_DELAY);
    }
  };

  voiceSystem.recognition.onerror = function (event) {
    voiceSystem.listening = false;
    if (voiceSystem.silenceTimer) clearTimeout(voiceSystem.silenceTimer);
    
    // Don't restart if paused for external STT
    if (voiceSystem.paused) return;
    if (event.error === 'no-speech' || event.error === 'aborted') {
      restartVoiceSystem();
    }
  };

  voiceSystem.recognition.onend = function () {
    voiceSystem.listening = false;
    if (voiceSystem.silenceTimer) clearTimeout(voiceSystem.silenceTimer);
    
    // Don't restart if paused for external STT
    if (voiceSystem.paused) return;
    if (voiceSystem.mode === 'field') {
      cleanupFieldMode();
    }
    restartVoiceSystem();
  };

  startVoiceSystem();
}

// Add pause/resume helpers for external STT coordination
function pauseGlobalVoice() {
  voiceSystem.paused = true;
  if (voiceSystem.silenceTimer) clearTimeout(voiceSystem.silenceTimer);
  if (voiceSystem.recognition && voiceSystem.listening) {
    try { voiceSystem.recognition.abort(); } catch (e) {}
  }
}

function resumeGlobalVoice() {
  voiceSystem.paused = false;
  restartVoiceSystem();
}

function startVoiceSystem() {
  if (voiceSystem.recognition && !voiceSystem.listening) {
    try {
      voiceSystem.recognition.start();
    } catch (e) {
      setTimeout(startVoiceSystem, 500);
    }
  }
}

function restartVoiceSystem() {
  setTimeout(function () {
    voiceSystem.mode = 'global';
    startVoiceSystem();
  }, 300);
}

function switchToFieldMode(wrapper, onComplete) {
  var input = wrapper.querySelector('input') || wrapper.querySelector('textarea');
  var status = wrapper.querySelector('.voice-status');
  if (!input) return;

  if (voiceSystem.mode === 'field' && voiceSystem.activeWrapper === wrapper) {
    switchToGlobalMode();
    return;
  }

  // CRITICAL: Clear everything before starting
  voiceSystem.existingText = '';
  
  voiceSystem.mode = 'field';
  voiceSystem.activeWrapper = wrapper;
  voiceSystem.activeInput = input;
  voiceSystem.activeStatus = status;
  voiceSystem.onFieldComplete = onComplete || null;

  // Clear the input when starting
  input.value = '';

  wrapper.classList.add('listening');
  wrapper.classList.remove('gazing');
  if (status) status.textContent = '🎤 Listening... (will auto-complete after silence)';

  if (!voiceSystem.listening) {
    startVoiceSystem();
  }
}

function switchToGlobalMode() {
  if (voiceSystem.silenceTimer) {
    clearTimeout(voiceSystem.silenceTimer);
    voiceSystem.silenceTimer = null;
  }
  
  // CRITICAL: Clear existingText when leaving field mode
  voiceSystem.existingText = '';
  
  cleanupFieldMode();
  voiceSystem.mode = 'global';
}

function cleanupFieldMode() {
  if (voiceSystem.activeWrapper) {
    voiceSystem.activeWrapper.classList.remove('listening');
  }
  if (voiceSystem.activeStatus) {
    var status = voiceSystem.activeStatus;
    setTimeout(function () {
      if (voiceSystem.mode === 'global') status.textContent = '';
    }, 3000);
  }
  if (voiceSystem.activeDwellBtn) {
    voiceSystem.activeDwellBtn.reset();
  }
  if (voiceSystem.onFieldComplete) {
    voiceSystem.onFieldComplete();
  }

  voiceSystem.activeWrapper = null;
  voiceSystem.activeInput = null;
  voiceSystem.activeStatus = null;
  voiceSystem.activeDwellBtn = null;
  // CRITICAL: Clear existingText in cleanup too
  voiceSystem.existingText = '';
  voiceSystem.onFieldComplete = null;
}

function switchToGlobalMode() {
  if (voiceSystem.silenceTimer) {
    clearTimeout(voiceSystem.silenceTimer);
    voiceSystem.silenceTimer = null;
  }
  cleanupFieldMode();
  voiceSystem.mode = 'global';
}

function cleanupFieldMode() {
  if (voiceSystem.activeWrapper) {
    voiceSystem.activeWrapper.classList.remove('listening');
  }
  if (voiceSystem.activeStatus) {
    var status = voiceSystem.activeStatus;
    setTimeout(function () {
      if (voiceSystem.mode === 'global') status.textContent = '';
    }, 3000);
  }
  if (voiceSystem.activeDwellBtn) {
    voiceSystem.activeDwellBtn.reset();
  }
  if (voiceSystem.onFieldComplete) {
    voiceSystem.onFieldComplete();
  }

  voiceSystem.activeWrapper = null;
  voiceSystem.activeInput = null;
  voiceSystem.activeStatus = null;
  voiceSystem.activeDwellBtn = null;
  voiceSystem.existingText = '';
  voiceSystem.onFieldComplete = null;
}

function handleFieldInput(transcript, isFinal) {
  var input = voiceSystem.activeInput;
  var status = voiceSystem.activeStatus;
  if (!input) return;

  if (isFinal) {
    // Always append to fresh start (since existingText is cleared at start)
    var newText = voiceSystem.existingText ? voiceSystem.existingText + ' ' + transcript.trim() : transcript.trim();
    input.value = newText;
    voiceSystem.existingText = newText;

    if (input.tagName === 'TEXTAREA') {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    }

    if (status) status.textContent = '✅ Got it! (continuing to listen...)';
  } else {
    if (status) status.textContent = '🎤 ' + transcript;
  }
}

function handleGlobalCommand(transcript) {
  // Skip calibration voice command
  if (matchCommand(transcript, [
    'eyeq skip calibration', 'eye q skip calibration', 'iq skip calibration',
    'eyeq skip', 'eye q skip', 'iq skip'
  ])) {
    if (_calibrationActive) {
      showCommandFeedback('⏭️ Skipping Calibration');
      // Find and trigger skip on the active calibration
      var skipBtn = document.getElementById('cal-skip-btn');
      if (skipBtn) skipBtn.click();
    }
    return;
  }

  if (matchCommand(transcript, ['eyeq skip', 'eye q skip', 'iq skip', 'eyeq skip tour', 'eye q skip tour', 'iq skip tour'])) {
    if (guidedTour.active) {
      showCommandFeedback('⏭️ Skipping Tour');
      skipTour();
    }
    return;
  }

  if (matchCommand(transcript, ['eyeq home', 'eye q home', 'iq home'])) {
    showCommandFeedback('🏠 Going Home');
    setTimeout(function () { window.location.href = '/'; }, 500);
    return;
  }

  if (matchCommand(transcript, ['eyeq recalibrate', 'eye q recalibrate', 'iq recalibrate'])) {
    showCommandFeedback('🎯 Starting Recalibration');
    if (typeof forceRecalibrate === 'function') forceRecalibrate();
    return;
  }

  if (matchCommand(transcript, [
    'eyeq ai', 'eyeq help', 'eyeq assistant',
    'eye q ai', 'eye q help', 'eye q assistant',
    'iq ai', 'iq help', 'iq assistant'
  ])) {
    showCommandFeedback('🤖 Opening AI Assistant');
    var trigger = document.getElementById('chatbox-trigger');
    if (trigger) trigger.click();
    return;
  }

  if (matchCommand(transcript, ['eyeq quiz', 'eye q quiz', 'iq quiz', 'eyeq start quiz', 'eye q start quiz', 'iq start quiz'])) {
    showCommandFeedback('📝 Opening Quiz');
    setTimeout(function () { window.location.href = '/ai-quiz'; }, 500);
    return;
  }

  if (matchCommand(transcript, [
    'eyeq create set', 'eye q create set', 'iq create set',
    'eyeq create', 'eye q create', 'iq create',
    'eyeq new set', 'eye q new set', 'iq new set'
  ])) {
    showCommandFeedback('➕ Creating New Set');
    setTimeout(function () { window.location.href = '/create-set'; }, 500);
    return;
  }

  if (matchCommand(transcript, ['eyeq practice', 'eye q practice', 'iq practice', 'eyeq study', 'eye q study', 'iq study'])) {
    showCommandFeedback('📚 Opening Practice');
    setTimeout(function () { window.location.href = '/practice'; }, 500);
    return;
  }

  if (matchCommand(transcript, [
    'eyeq library', 'eye q library', 'iq library',
    'eyeq sets', 'eye q sets', 'iq sets',
    'eyeq flashcards', 'eye q flashcards', 'iq flashcards'
  ])) {
    showCommandFeedback('📖 Opening Library');
    setTimeout(function () { window.location.href = '/library'; }, 500);
    return;
  }
}

function matchCommand(transcript, commands) {
  for (var j = 0; j < commands.length; j++) {
    if (transcript.includes(commands[j])) return true;
  }
  return false;
}

// function showVoiceFeedback(transcript) {
//   var el = document.getElementById('voice-feedback');
//   if (!el) {
//     el = document.createElement('div');
//     el.id = 'voice-feedback';
//     el.style.cssText =
//       'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
//       'background:rgba(30,30,46,0.95);color:#a6adc8;padding:0.75rem 1.5rem;' +
//       'border-radius:0.75rem;font-size:0.875rem;z-index:99999;display:none;' +
//       'border:1px solid rgba(166,173,200,0.2);font-family:monospace;';
//     document.body.appendChild(el);
//   }

//   el.textContent = '🎤 "' + transcript + '"';
//   el.style.display = 'block';
//   el.style.opacity = '1';

//   setTimeout(function () {
//     el.style.opacity = '0';
//     el.style.transition = 'opacity 0.3s';
//   }, 1500);

//   setTimeout(function () {
//     el.style.display = 'none';
//     el.style.opacity = '1';
//   }, 1800);
// }

function showCommandFeedback(message) {
  var el = document.getElementById('command-feedback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'command-feedback';
    el.style.cssText =
      'position:fixed;top:70px;left:50%;transform:translateX(-50%);' +
      'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);' +
      'color:white;padding:1rem 2rem;border-radius:0.75rem;' +
      'font-size:1.125rem;z-index:99999;display:none;' +
      'box-shadow:0 8px 32px rgba(102,126,234,0.4);font-weight:600;';
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.style.display = 'block';
  el.style.transform = 'translateX(-50%) scale(0.8)';
  el.style.opacity = '0';
  el.style.transition = 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)';

  setTimeout(function () {
    el.style.transform = 'translateX(-50%) scale(1)';
    el.style.opacity = '1';
  }, 10);

  setTimeout(function () {
    el.style.transform = 'translateX(-50%) scale(0.8)';
    el.style.opacity = '0';
  }, 1500);

  setTimeout(function () {
    el.style.display = 'none';
  }, 1800);
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(initVoiceSystem, 2000);
});

var guidedTour = {
  active: false,
  currentStep: 0,
  steps: [],
  overlay: null,
  tooltip: null,
  skipBtn: null,
  onComplete: null,
  tooltipDwell: null
};

function initGuidedTour(onComplete) {
  if (localStorage.getItem('eyeq_tour_completed') === 'true') {
    if (onComplete) onComplete();
    return;
  }

  guidedTour.onComplete = onComplete;
  guidedTour.steps = buildTourSteps();

  if (guidedTour.steps.length === 0) {
    completeTour();
    return;
  }

  createTourUI();
  guidedTour.active = true;
  guidedTour.currentStep = 0;
  showTourStep(0);
}

function buildTourSteps() {
  var steps = [];

  steps.push({
    type: 'welcome',
    title: '👁️ Welcome to EyeQ!',
    content: 'EyeQ is an eye-tracking study platform. You can control everything with your eyes — just look at buttons to activate them, or use voice commands.\n\nLet\'s take a quick tour to learn how it works.',
    position: 'center'
  });

  steps.push({
    type: 'info',
    title: '👀 How Gaze Control Works',
    content: 'When you look at a button, a progress bar fills up. Once it\'s full, the action triggers automatically.\n\nThis is called "dwell selection" — no clicking needed!',
    position: 'center'
  });

  var homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    steps.push({
      type: 'element',
      target: 'home-btn',
      title: '🏠 Home Button',
      content: 'Look at this button to return to the home screen from any page.\n\n• Gaze: Look for 1.5 seconds\n• Voice: Say "EyeQ Home"',
      position: 'right'
    });
  }

  var calibrateBtn = document.getElementById('calibrate-btn');
  if (calibrateBtn) {
    steps.push({
      type: 'element',
      target: 'calibrate-btn',
      title: '🎯 Recalibrate Button',
      content: 'If eye tracking feels inaccurate, use this to recalibrate. The more you calibrate, the better it gets!\n\n• Gaze: Look for 1.5 seconds\n• Voice: Say "EyeQ Recalibrate"',
      position: 'left'
    });
  }

  var chatboxTrigger = document.getElementById('chatbox-trigger');
  if (chatboxTrigger) {
    steps.push({
      type: 'element',
      target: 'chatbox-trigger',
      title: '🤖 AI Assistant',
      content: 'Need help? Open the AI assistant to ask questions about any topic. It can explain concepts, suggest study materials, and more.\n\n• Gaze: Look for 2 seconds\n• Voice: Say "EyeQ Help" or "EyeQ AI"',
      position: 'left'
    });
  }

  steps.push({
    type: 'info',
    title: '🎤 Voice Commands',
    content: 'EyeQ is always listening for voice commands. Start any command with "EyeQ" followed by:\n\n• "Home" — Go to home page\n• "Recalibrate" — Start calibration\n• "Help" or "AI" — Open assistant\n• "Quiz" — Start a quiz\n• "Create Set" — Create flashcards\n• "Library" — View your sets\n• "Practice" — Practice flashcards',
    position: 'center'
  });

  var modeCards = document.querySelectorAll('.mode-card');
  if (modeCards.length > 0) {
    steps.push({
      type: 'element',
      target: modeCards[0],
      targetIsElement: true,
      title: '📱 Navigation Cards',
      content: 'These cards let you navigate to different features. Just look at any card until the progress bar fills to go there.\n\nTry exploring Quiz, Create Set, Library, or Practice!',
      position: 'bottom'
    });
  }

  steps.push({
    type: 'complete',
    title: '🎉 You\'re Ready!',
    content: 'That\'s everything you need to know! Remember:\n\n• Look at buttons to activate them\n• Say "EyeQ" + command for voice control\n• The AI assistant is always there to help\n\nEnjoy studying with EyeQ!',
    position: 'center'
  });

  return steps;
}

function createTourUI() {
  guidedTour.overlay = document.createElement('div');
  guidedTour.overlay.id = 'tour-overlay';
  guidedTour.overlay.innerHTML = '<div class="tour-backdrop"></div>';
  document.body.appendChild(guidedTour.overlay);

  guidedTour.tooltip = document.createElement('div');
  guidedTour.tooltip.id = 'tour-tooltip';
  guidedTour.tooltip.innerHTML =
    '<div class="tour-step-indicator"></div>' +
    '<h2 class="tour-title"></h2>' +
    '<div class="tour-content"></div>' +
    '<div class="tour-continue-text">👁️ Look anywhere on this box to continue</div>' +
    '<div class="tour-dwell-bar"><div class="tour-dwell-fill"></div></div>';
  document.body.appendChild(guidedTour.tooltip);

  guidedTour.skipBtn = document.createElement('button');
  guidedTour.skipBtn.id = 'tour-skip-btn';
  guidedTour.skipBtn.innerHTML =
    '⏭️ Skip Tour' +
    '<div class="dwell-bar"><div class="dwell-fill"></div></div>';
  document.body.appendChild(guidedTour.skipBtn);

  guidedTour.skipBtn.addEventListener('click', function () {
    skipTour();
  });

  var skipDwell = new DwellButton(guidedTour.skipBtn, 1500, function () {
    skipTour();
  });

  guidedTour.tooltip.addEventListener('click', function () {
    advanceTour();
  });

  guidedTour.tooltipDwell = {
    isGazing: false,
    startTime: 0,
    dwellTime: 3500,
    fill: guidedTour.tooltip.querySelector('.tour-dwell-fill'),
    activated: false
  };

  guidedTour._gazeCallback = function (x, y) {
    if (!guidedTour.active) return;
    skipDwell.update(x, y);
    updateTooltipDwell(x, y);
  };
  onGaze(guidedTour._gazeCallback);

  injectTourStyles();
}

function updateTooltipDwell(x, y) {
  if (!guidedTour.tooltip || !guidedTour.tooltipDwell || guidedTour.tooltipDwell.activated) return;

  var rect = guidedTour.tooltip.getBoundingClientRect();
  var pad = 50;
  var inside = x >= rect.left - pad && x <= rect.right + pad &&
               y >= rect.top - pad && y <= rect.bottom + pad;

  var dwell = guidedTour.tooltipDwell;

  if (inside) {
    guidedTour.tooltip.classList.add('gazing');
    if (!dwell.isGazing) {
      dwell.isGazing = true;
      dwell.startTime = Date.now();
    }

    var elapsed = Date.now() - dwell.startTime;
    var pct = Math.min((elapsed / dwell.dwellTime) * 100, 100);
    if (dwell.fill) dwell.fill.style.width = pct + '%';

    if (elapsed >= dwell.dwellTime) {
    dwell.activated = true;
    dwell.isGazing = false;
    dwell.startTime = 0;
    if (dwell.fill) dwell.fill.style.width = '0%';
    advanceTour();
  }
  } else {
    guidedTour.tooltip.classList.remove('gazing');
    dwell.isGazing = false;
    dwell.startTime = 0;
    if (dwell.fill) dwell.fill.style.width = '0%';
  }
}

function showTourStep(index) {
  if (index >= guidedTour.steps.length) {
    completeTour();
    return;
  }

  var step = guidedTour.steps[index];
  guidedTour.currentStep = index;

  if (guidedTour.tooltipDwell) {
    guidedTour.tooltipDwell.activated = false;
    guidedTour.tooltipDwell.isGazing = false;
    guidedTour.tooltipDwell.startTime = 0;
    if (guidedTour.tooltipDwell.fill) {
      guidedTour.tooltipDwell.fill.style.width = '0%';
    }
  }

  var tooltip = guidedTour.tooltip;
  tooltip.classList.remove('gazing');
  tooltip.querySelector('.tour-step-indicator').textContent = 'Step ' + (index + 1) + ' of ' + guidedTour.steps.length;
  tooltip.querySelector('.tour-title').textContent = step.title;
  tooltip.querySelector('.tour-content').textContent = step.content;

  var continueText = tooltip.querySelector('.tour-continue-text');
  if (index === guidedTour.steps.length - 1) {
    continueText.textContent = '👁️ Look anywhere on this box to finish';
  } else {
    continueText.textContent = '👁️ Look anywhere on this box to continue';
  }

  document.querySelectorAll('.tour-highlight').forEach(function (el) {
    el.classList.remove('tour-highlight');
  });

  tooltip.style.opacity = '0';

  if (step.type === 'element' && step.target) {
    var targetEl = step.targetIsElement ? step.target : document.getElementById(step.target);
    if (targetEl) {
      targetEl.classList.add('tour-highlight');
      positionTooltipNearElement(tooltip, targetEl, step.position);
    } else {
      positionTooltipCenter(tooltip);
    }
  } else {
    positionTooltipCenter(tooltip);
  }

  requestAnimationFrame(function () {
    tooltip.style.transition = 'opacity 0.3s ease';
    tooltip.style.opacity = '1';
  });
}

function positionTooltipCenter(tooltip) {
  tooltip.style.position = 'fixed';
  tooltip.style.left = '50%';
  tooltip.style.top = '50%';
  tooltip.style.transform = 'translate(-50%, -50%)';
  tooltip.style.right = 'auto';
  tooltip.style.bottom = 'auto';
}

function positionTooltipNearElement(tooltip, element, position) {
  var elRect = element.getBoundingClientRect();
  var margin = 24;
  var tooltipWidth = 450;
  var tooltipHeight = 320;
  var vw = window.innerWidth;
  var vh = window.innerHeight;
  var edgePad = 20;

  tooltip.style.position = 'fixed';
  tooltip.style.transform = 'none';
  tooltip.style.right = 'auto';
  tooltip.style.bottom = 'auto';

  var left, top;

  if (position === 'right') {
    left = elRect.right + margin;
    top = Math.max(edgePad, elRect.top + elRect.height / 2 - tooltipHeight / 2);
  } else if (position === 'left') {
    left = elRect.left - tooltipWidth - margin;
    top = Math.max(edgePad, elRect.top + elRect.height / 2 - tooltipHeight / 2);
  } else if (position === 'bottom') {
    left = Math.max(edgePad, elRect.left + elRect.width / 2 - tooltipWidth / 2);
    top = elRect.bottom + margin;
  } else if (position === 'top') {
    left = Math.max(edgePad, elRect.left + elRect.width / 2 - tooltipWidth / 2);
    top = elRect.top - tooltipHeight - margin;
  } else {
    positionTooltipCenter(tooltip);
    return;
  }

  if (left + tooltipWidth > vw - edgePad) {
    if (position === 'right') {
      left = elRect.left - tooltipWidth - margin;
    } else {
      left = vw - tooltipWidth - edgePad;
    }
  }
  if (left < edgePad) {
    if (position === 'left') {
      left = elRect.right + margin;
    } else {
      left = edgePad;
    }
  }

  if (top + tooltipHeight > vh - edgePad) {
    top = vh - tooltipHeight - edgePad;
  }
  if (top < edgePad) {
    top = edgePad;
  }

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function advanceTour() {
  guidedTour.currentStep++;
  if (guidedTour.currentStep >= guidedTour.steps.length) {
    completeTour();
  } else {
    showTourStep(guidedTour.currentStep);
  }
}

function skipTour() {
  completeTour();
}

function completeTour() {
  guidedTour.active = false;

  if (guidedTour._gazeCallback) {
    var idx = _gazeCallbacks.indexOf(guidedTour._gazeCallback);
    if (idx > -1) _gazeCallbacks.splice(idx, 1);
    guidedTour._gazeCallback = null;
  }

  localStorage.setItem('eyeq_tour_completed', 'true');

  document.querySelectorAll('.tour-highlight').forEach(function (el) {
    el.classList.remove('tour-highlight');
  });

  if (guidedTour.overlay) {
    guidedTour.overlay.style.opacity = '0';
    setTimeout(function () { if (guidedTour.overlay) guidedTour.overlay.remove(); }, 300);
  }

  if (guidedTour.tooltip) {
    guidedTour.tooltip.style.opacity = '0';
    setTimeout(function () { if (guidedTour.tooltip) guidedTour.tooltip.remove(); }, 300);
  }

  if (guidedTour.skipBtn) {
    guidedTour.skipBtn.style.opacity = '0';
    setTimeout(function () { if (guidedTour.skipBtn) guidedTour.skipBtn.remove(); }, 300);
  }

  if (guidedTour.onComplete) {
    guidedTour.onComplete();
  }
}

function resetTourForTesting() {
  localStorage.removeItem('eyeq_tour_completed');
  localStorage.removeItem('eyeq_calibrated');
}

function injectTourStyles() {
  if (document.getElementById('tour-styles')) return;

  var style = document.createElement('style');
  style.id = 'tour-styles';
  style.textContent =
    '#tour-overlay {' +
      'position:fixed;top:0;left:0;right:0;bottom:0;' +
      'z-index:99990;pointer-events:all;transition:opacity 0.3s;' +  // ← none → all
    '}' +
    '.tour-backdrop {' +
      'position:absolute;top:0;left:0;right:0;bottom:0;' +
      'background:rgba(0,0,0,0.7);pointer-events:all;' +  // ← add pointer-events:all
    '}' +
    '#tour-tooltip {' +
      'position:fixed;width:450px;max-width:calc(100vw - 40px);' +
      'background:linear-gradient(135deg,#1e1e2e 0%,#2a2a3e 100%);' +
      'border:4px solid #4f46e5;border-radius:1.5rem;padding:2rem;' +
      'z-index:99995;pointer-events:all;cursor:pointer;' +
      'box-shadow:0 20px 60px rgba(79,70,229,0.3),0 0 40px rgba(79,70,229,0.2);' +
      'overflow:hidden;transition:border-color 0.3s, box-shadow 0.3s;' +
    '}' +
    '#tour-tooltip.gazing {' +
      'border-color:#8b5cf6;' +
      'box-shadow:0 20px 60px rgba(139,92,246,0.4),0 0 60px rgba(139,92,246,0.3);' +
    '}' +
    '.tour-step-indicator {' +
      'font-size:0.8rem;color:#888;margin-bottom:0.5rem;' +
      'text-transform:uppercase;letter-spacing:0.1em;' +
    '}' +
    '.tour-title {' +
      'font-size:1.5rem;font-weight:700;color:#e0e0e0;margin:0 0 1rem 0;' +
    '}' +
    '.tour-content {' +
      'font-size:1.1rem;line-height:1.6;color:#a0a0a0;' +
      'white-space:pre-line;margin-bottom:1.5rem;' +
    '}' +
    '.tour-continue-text {' +
      'font-size:1rem;color:#8b5cf6;font-weight:600;' +
      'text-align:center;margin-bottom:0.75rem;' +
    '}' +
    '.tour-dwell-bar {' +
      'position:absolute;bottom:0;left:0;right:0;height:8px;' +
      'background:rgba(139,92,246,0.2);' +
    '}' +
    '.tour-dwell-fill {' +
      'height:100%;width:0%;' +
      'background:linear-gradient(90deg,#8b5cf6,#a78bfa);' +
      'transition:width 0.1s linear;' +
    '}' +
    '#tour-skip-btn {' +
      'position:fixed;bottom:2rem;left:2rem;padding:1.5rem 3rem;' +
      'font-size:1.35rem;font-weight:600;' +
      'background:rgba(239,68,68,0.15);border:3px solid rgba(239,68,68,0.4);' +
      'border-radius:1.25rem;color:#ef4444;cursor:pointer;' +
      'z-index:99996;transition:all 0.3s;overflow:hidden;pointer-events:all;' +
    '}' +
    '#tour-skip-btn:hover,#tour-skip-btn.gazing {' +
      'background:rgba(239,68,68,0.25);border-color:#ef4444;' +
      'transform:scale(1.05);box-shadow:0 0 2rem rgba(239,68,68,0.4);' +
    '}' +
    '#tour-skip-btn .dwell-bar {' +
      'position:absolute;bottom:0;left:0;right:0;height:6px;' +
      'background:rgba(239,68,68,0.2);' +
    '}' +
    '#tour-skip-btn .dwell-fill {' +
      'height:100%;width:0%;background:#ef4444;transition:width 0.1s linear;' +
    '}' +
    '.tour-highlight {' +
      'position:relasttive;z-index:99992 !important;' +
      'box-shadow:0 0 0 4px #4f46e5,0 0 30px rgba(79,70,229,0.6) !important;' +
      'animation:tour-pulse 2s infinite !important;' +
    '}' +
    '@keyframes tour-pulse {' +
      '0%,100% { box-shadow:0 0 0 4px #4f46e5,0 0 30px rgba(79,70,229,0.6); }' +
      '50% { box-shadow:0 0 0 6px #6366f1,0 0 50px rgba(99,102,241,0.8); }' +
    '}' +
    '@media (max-width:768px) {' +
      '#tour-tooltip { width:calc(100vw - 40px); }' +
      '#tour-skip-btn { bottom:1rem;left:1rem;padding:1rem 1.5rem;font-size:1rem; }' +
    '}';

  document.head.appendChild(style);
}