(function () {
  var panel = document.getElementById('chatbox-panel');
  var trigger = document.getElementById('chatbox-trigger');
  var closeBtn = document.getElementById('chatbox-close');
  var messagesDiv = document.getElementById('chat-messages');
  var textInput = document.getElementById('chat-text-input');

  if (!panel || !trigger) return;

  var chatOpen = false;
  var chatHistory = [];
  var chatDwellButtons = [];
  var chatSilenceTimer = null;
  var CHAT_SILENCE_DELAY = 2000;

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
        
        setTimeout(function() {
          if (chatOpen && textInput) {
            textInput.value = '';
            voiceSystem.existingText = '';
            startChatListening();
          }
        }, 500);
      })
      .catch(function () {
        removeTypingIndicator();
        addMessage('Sorry, something went wrong. Try again!', 'bot');

        setTimeout(function() {
          if (chatOpen && textInput) {
            textInput.value = '';
            voiceSystem.existingText = '';
            startChatListening();
          }
        }, 500);
      });
  }

  function openChatbox() {
    if (chatOpen) return;
    chatOpen = true;
    panel.classList.remove('hidden');
    panel.classList.add('slide-in');
    trigger.classList.add('hidden-trigger');
    setupChatDwellButtons();
    if (textInput) {
      textInput.focus();
      startChatListening();
    }
  }

  function closeChatbox() {
    if (!chatOpen) return;
    chatOpen = false;
    panel.classList.add('hidden');
    panel.classList.remove('slide-in');
    trigger.classList.remove('hidden-trigger');
    chatDwellButtons.forEach(function (b) { b.reset(); });
    chatDwellButtons = [];
    stopChatListening();

    if (textInput) {
      textInput.value = '';
    }
    voiceSystem.existingText = '';
  }

  function startChatListening() {
    if (typeof switchToFieldMode !== 'function') return;
    
    var wrapper = textInput.parentElement;
    
    textInput.value = '';
    voiceSystem.existingText = '';
    
    switchToFieldMode(wrapper, function() {e
      var msg = textInput.value.trim();
      if (msg) {
        sendChatMessage(msg);
        textInput.value = '';
        voiceSystem.existingText = '';
      }
    });
  }

  function stopChatListening() {
    if (chatSilenceTimer) clearTimeout(chatSilenceTimer);
    if (typeof switchToGlobalMode === 'function') {
      switchToGlobalMode();
    }
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

  trigger.addEventListener('click', openChatbox);
  closeBtn.addEventListener('click', closeChatbox);

  if (textInput) {
    textInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        var msg = textInput.value.trim();
        if (msg) {
          sendChatMessage(msg);
          textInput.value = '';
        }
      }
    });

    var lastValue = '';
    setInterval(function() {
      if (!chatOpen) return;
      
      var currentValue = textInput.value.trim();

      if (currentValue !== lastValue) {
        lastValue = currentValue;
        
        if (chatSilenceTimer) clearTimeout(chatSilenceTimer);

        if (currentValue) {
          chatSilenceTimer = setTimeout(function() {
            if (textInput.value.trim()) {
              sendChatMessage(textInput.value.trim());
              textInput.value = '';
              voiceSystem.existingText = '';
              lastValue = '';
            }
          }, CHAT_SILENCE_DELAY);
        }
      }
    }, 100);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && chatOpen) closeChatbox();
  });

  initTriggerDwell();

  window.updateChatbotDwell = function(x, y) {
    if (triggerDwell && !chatOpen) {
      triggerDwell.update(x, y);
    }
    if (chatOpen) {
      chatDwellButtons.forEach(function (b) { b.update(x, y); });
    }
  };
})();