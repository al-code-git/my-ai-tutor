const messagesDiv = document.getElementById('messages');
const input = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const status = document.getElementById('status');

let ws;
let isListening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

// Connect to WebSocket
function connect() {
    const wsUrl = `ws://${window.location.hostname}:5000`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Connected to server');
        status.textContent = '🟢 Connected';
        status.classList.remove('disconnected');
        status.classList.add('connected');
        input.disabled = false;
        sendBtn.disabled = false;
        voiceBtn.disabled = false;
        clearMessages();
        addMessage('tutor', 'Hi! I\'m your AI tutor. How can I help you today?');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'response') {
            addMessage('tutor', data.text);
            speak(data.text);
        }
    };

    ws.onerror = () => {
        status.textContent = '🔴 Error';
    };

    ws.onclose = () => {
        console.log('Disconnected');
        status.textContent = '🔴 Disconnected';
        status.classList.remove('connected');
        status.classList.add('disconnected');
        input.disabled = true;
        sendBtn.disabled = true;
        voiceBtn.disabled = true;
        setTimeout(connect, 3000);
    };
}

function addMessage(role, text) {
    if (messagesDiv.querySelector('.empty-state')) {
        messagesDiv.innerHTML = '';
    }
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearMessages() {
    messagesDiv.innerHTML = '<div class="empty-state">Start chatting with your AI tutor!</div>';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sendMessage() {
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    addMessage('user', text);
    ws.send(JSON.stringify({ text }));
    input.value = '';
}

function startVoice() {
    if (!SpeechRecognition) {
        alert('Speech Recognition not supported in your browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('recording');
        voiceBtn.textContent = '⏹️ Stop';
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        input.value = finalTranscript + interimTranscript;
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.textContent = '🎤';
    };

    recognition.start();
}

function stopVoice() {
    if (recognition) {
        recognition.stop();
        const text = input.value.trim();
        if (text) {
            sendMessage();
        }
    }
}

function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}

// Event listeners
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

voiceBtn.addEventListener('click', () => {
    if (isListening) {
        stopVoice();
    } else {
        startVoice();
    }
});

// Start connection
connect();
