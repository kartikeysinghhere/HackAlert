document.addEventListener('DOMContentLoaded', () => {
    const chatbox = document.getElementById('chatbox');
    const suggestionButtons = document.getElementById('suggestions-buttons');
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('sendButton');

    const initialSuggestions = [
        "What is a hackathon?",
        "How do I find a team?",
        "Find upcoming hackathons",
        "Brainstorm project ideas"
    ];

    function displayMessage(message, sender) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = message;
        messageWrapper.appendChild(messageText);
        chatbox.appendChild(messageWrapper);
        chatbox.scrollTop = chatbox.scrollHeight;
        return messageWrapper;
    }

    async function askQuestion(question) {
        displayMessage(question, 'user');
        toggleInputs(false);

        // add thinking placeholder and keep reference
        const thinkingElem = displayMessage("Thinking...", 'bot');

        try {
            console.log('Sending question to server:', question);
            const response = await fetch('http://localhost:3000/ask', { // use full URL for clarity
            const response = await fetch('/ask', { // use relative URL for production compatibility
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            console.log('Fetch finished. status=', response.status, 'ok=', response.ok);

            // try parse JSON safely
            let data;
            const text = await response.text();
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseErr) {
                console.error('Failed to parse JSON response:', parseErr, 'raw:', text);
                throw new Error('Invalid JSON from server');
            }

            if (!response.ok) {
                console.error('Server returned error:', response.status, data);
                throw new Error(data && data.error ? data.error : `Server error ${response.status}`);
            }

            if (!data || typeof data.answer !== 'string') {
                throw new Error('Unexpected server response format');
            }

            thinkingElem.querySelector('.message-text').textContent = data.answer;
            updateSuggestionButtons(data.followUpQuestions || []);
        } catch (error) {
            console.error('askQuestion error:', error);
            thinkingElem.querySelector('.message-text').textContent = "Sorry, something went wrong. Please try again!";
        } finally {
            toggleInputs(true);
        }
    }

    function updateSuggestionButtons(suggestions) {
        suggestionButtons.innerHTML = '';
        if (!suggestions || !suggestions.length) return;
        suggestions.forEach(q => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = q;
            btn.addEventListener('click', () => askQuestion(q));
            suggestionButtons.appendChild(btn);
        });
    }

    function toggleInputs(enabled) {
        userInput.disabled = !enabled;
        sendButton.disabled = !enabled;
        suggestionButtons.querySelectorAll('button').forEach(b => b.disabled = !enabled);
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const txt = userInput.value.trim();
        if (!txt) return;
        askQuestion(txt);
        userInput.value = '';
    });

    function init() {
        displayMessage("Hello! I'm the HackAlert Bot. Ask me anything or choose a suggestion below.", 'bot');
        updateSuggestionButtons(initialSuggestions);
    }

    init();
});