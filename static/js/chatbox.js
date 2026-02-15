(function () {
  var panel = document.getElementById('chatbox-panel');
  var trigger = document.getElementById('chatbox-trigger');
  var closeBtn = document.getElementById('chatbox-close');
  var messagesDiv = document.getElementById('chat-messages');
  var micBtn = document.getElementById('chat-mic-btn');
  var interimDiv = document.getElementById('chat-interim');
  var listeningDiv = document.getElementById('chat-listening');

  if (!panel || !trigger) return;

  var chatOpen = false;
  var chatRecognition = null;
  var chatIsListening = false;
  var chatHistory = [];
  var chatDwellButtons = [];

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function initChatSpeech() {
    if (!SR) return;

    chatRecognition = new SR();
    chatRecognition.continuous = false;
    chatRecognition.interimResults = true;
    chatRecognition.lang = 'en-US';
    chatRecognition.maxAlternatives = 1;

    chatRecognition.onstart = function () {
      chatIsListening = true;
      if (micBtn) micBtn.classList.add('listening');
      if (listeningDiv) listeningDiv.classList.remove('hidden');
    };

    chatRecognition.onresult = function (event) {
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

      if (interimDiv) interimDiv.textContent = interimTranscript || '';

      if (finalTranscript) {
        if (interimDiv) interimDiv.textContent = '';
        sendChatMessage(finalTranscript.trim());
      }
    };

    chatRecognition.onerror = function () {
      chatIsListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      if (listeningDiv) listeningDiv.classList.add('hidden');
    };

    chatRecognition.onend = function () {
      chatIsListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      if (listeningDiv) listeningDiv.classList.add('hidden');
    };
  }

  function startChatListening() {
    if (!chatRecognition) initChatSpeech();
    if (chatRecognition && !chatIsListening) {
      try {
        chatRecognition.start();
      } catch (e) {
        chatRecognition.stop();
        setTimeout(function () { chatRecognition.start(); }, 150);
      }
    }
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function addMessage(text, sender) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + sender;
    div.innerHTML = '<p>' + escapeHtml(text) + '</p>';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addTypingIndicator() {
    var div = document.createElement('div');
    div.className = 'chat-msg bot typing';
    div.id = 'chat-typing';
    div.innerHTML = '<p><span class="typing-dots"><span></span><span></span><span></span></span></p>';
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function removeTypingIndicator() {
    var el = document.getElementById('chat-typing');
    if (el) el.remove();
  }

  function sendChatMessage(userMessage) {
    if (!userMessage.trim()) return;

    addMessage(userMessage, 'user');
    chatHistory.push({ role: 'user', content: userMessage });
    addTypingIndicator();

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: chatHistory.slice(-10)
      })
    })
      .then(function (response) {
        removeTypingIndicator();
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        var botReply = data.response || 'Sorry, I couldn\'t process that.';
        addMessage(botReply, 'bot');
        chatHistory.push({ role: 'assistant', content: botReply });
      })
      .catch(function () {
        removeTypingIndicator();
        addMessage('Sorry, something went wrong. Try again!', 'bot');
      });
  }

  function openChatbox() {
    if (chatOpen) return;
    chatOpen = true;
    panel.classList.remove('hidden');
    panel.classList.add('slide-in');
    trigger.classList.add('hidden-trigger');
    setupChatDwellButtons();
  }

  function closeChatbox() {
    if (!chatOpen) return;
    chatOpen = false;
    panel.classList.add('hidden');
    panel.classList.remove('slide-in');
    trigger.classList.remove('hidden-trigger');
    if (chatRecognition && chatIsListening) chatRecognition.stop();
    chatDwellButtons.forEach(function (b) { b.reset(); });
    chatDwellButtons = [];
  }

  function setupChatDwellButtons() {
    chatDwellButtons.forEach(function (b) { b.reset(); });
    chatDwellButtons = [];

    if (typeof DwellButton === 'undefined') return;

    var closeDwell = new DwellButton(closeBtn, 1200, function () {
      closeChatbox();
      setTimeout(function () { closeDwell.reset(); }, 2000);
    });
    chatDwellButtons.push(closeDwell);

    var micDwell = new DwellButton(micBtn, 1500, function () {
      startChatListening();
      setTimeout(function () { micDwell.reset(); }, 2500);
    });
    chatDwellButtons.push(micDwell);
  }

  var triggerDwell = null;

  function initTriggerDwell() {
    if (typeof DwellButton === 'undefined') {
      setTimeout(initTriggerDwell, 500);
      return;
    }

    triggerDwell = new DwellButton(trigger, 2000, function () {
      openChatbox();
      setTimeout(function () { triggerDwell.reset(); }, 3000);
    });
  }

  function pollGaze() {
    var gazeDot = document.getElementById('gaze-dot');
    if (!gazeDot || gazeDot.style.display === 'none') return;

    var x = parseFloat(gazeDot.style.left) || 0;
    var y = parseFloat(gazeDot.style.top) || 0;
    if (x === 0 && y === 0) return;

    if (triggerDwell && !chatOpen) {
      triggerDwell.update(x, y);
    }

    if (chatOpen) {
      chatDwellButtons.forEach(function (b) { b.update(x, y); });
    }
  }

  trigger.addEventListener('click', openChatbox);
  closeBtn.addEventListener('click', closeChatbox);

  micBtn.addEventListener('click', function () {
    if (chatIsListening) {
      chatRecognition.stop();
    } else {
      startChatListening();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chatOpen) closeChatbox();
  });

  initChatSpeech();
  initTriggerDwell();
  setInterval(pollGaze, 50);
})();