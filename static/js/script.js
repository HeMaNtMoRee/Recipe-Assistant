document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const clearChatBtn = document.getElementById('clear-chat');
    const emojiBtn = document.getElementById('emoji-btn');
    const welcomeMessage = document.querySelector('.welcome-message');

    // Quick suggestion buttons
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    clearChatBtn.addEventListener('click', clearChat);

    emojiBtn.addEventListener('click', () => {
        // Emoji picker functionality
        const emojis = ['😊', '👍', '❤️', '🍕', '🍔', '🍰', '🥗'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        userInput.value += randomEmoji;
        userInput.focus();
    });

    // Suggestion buttons handler
    suggestionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const suggestion = btn.getAttribute('data-suggestion');
            userInput.value = suggestion;
            sendMessage();
        });
    });

    // Auto-resize input
    userInput.addEventListener('input', () => {
        if (userInput.value.length > 0) {
            sendBtn.style.opacity = '1';
        } else {
            sendBtn.style.opacity = '0.5';
        }
    });

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        // Hide welcome message on first message
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Append user message
        appendMessage('user', messageText);
        userInput.value = '';
        sendBtn.style.opacity = '0.5';

        // Show typing indicator
        showTypingIndicator();

        // Create a new message element for the bot's streaming response
        const botMessageElement = createBotMessageElement();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            // Hide typing indicator once stream starts
            hideTypingIndicator();

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';

            // Read the stream
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }
                
                // Decode the chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });

                // Process complete JSON objects in the buffer
                const lines = buffer.split('\n');
                
                // Keep the last (potentially incomplete) line in the buffer
                buffer = lines.pop() || ''; 

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    try {
                        const parsed = JSON.parse(line);
                        
                        // Handle error messages
                        if (parsed.error) {
                            const contentDiv = botMessageElement.querySelector('.message-content');
                            contentDiv.textContent = parsed.error;
                            break;
                        }
                        
                        // Append the token from the 'response' key (Ollama format)
                        if (parsed.response !== undefined) {
                            fullResponse += parsed.response;
                            const contentDiv = botMessageElement.querySelector('.message-content');
                            contentDiv.textContent = fullResponse;
                            scrollToBottom();
                        }
                        
                        // Check if this is the final message (Ollama sends 'done': true)
                        if (parsed.done === true) {
                            console.log('Stream complete');
                        }
                    } catch (error) {
                        console.error('Failed to parse JSON line:', line, error);
                        console.error('Line content:', line);
                    }
                }
            }

        } catch (error) {
            console.error('Error during fetch:', error);
            hideTypingIndicator();
            const contentDiv = botMessageElement.querySelector('.message-content');
            contentDiv.textContent = 'Sorry, I encountered an error. Please try again.';
        }
    }

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        // Create avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        
        if (sender === 'bot') {
            avatarDiv.innerHTML = '<i class="fas fa-utensils"></i>';
        } else {
            avatarDiv.innerHTML = '<i class="fas fa-user"></i>';
        }

        // Create message content
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text;

        // Append elements
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatBox.appendChild(messageDiv);
        
        // Scroll to bottom with smooth animation
        scrollToBottom();
    }

    function createBotMessageElement() {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot-message');

        // Create avatar
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('message-avatar');
        avatarDiv.innerHTML = '<i class="fas fa-utensils"></i>';

        // Create message content (empty, will be filled by streaming)
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = '';

        // Append elements
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatBox.appendChild(messageDiv);
        scrollToBottom();
        
        return messageDiv;
    }

    function showTypingIndicator() {
        typingIndicator.classList.add('active');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.remove('active');
    }

    function scrollToBottom() {
        setTimeout(() => {
            chatBox.scrollTo({
                top: chatBox.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    function clearChat() {
        // Show confirmation
        if (confirm('Are you sure you want to clear the chat history?')) {
            // Remove all messages except welcome
            const messages = chatBox.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            // Show welcome message again
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }

            // Add clear animation
            chatBox.style.opacity = '0';
            setTimeout(() => {
                chatBox.style.opacity = '1';
            }, 300);
        }
    }

    // Add timestamp to messages (optional feature)
    function getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Initialize - focus input on load
    userInput.focus();

    // Add welcome animation
    setTimeout(() => {
        if (welcomeMessage) {
            welcomeMessage.style.opacity = '1';
        }
    }, 300);
});