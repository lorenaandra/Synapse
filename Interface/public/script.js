document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded');
    console.log('salutation:', document.getElementById('salutation'));
    console.log('question:', document.getElementById('question'));
    console.log('messages:', document.getElementById('messages'));
    console.log('messageInput:', document.getElementById('messageInput'));
    console.log('sendBtn:', document.getElementById('sendBtn'));
    console.log('themeToggle:', document.getElementById('themeToggle'));
    console.log('tempChat:', document.getElementById('tempChat'));
    console.log('newChat:', document.getElementById('newChat'));
    console.log('conversations:', document.getElementById('conversations'));
    console.log('topSearches:', document.getElementById('top-searches'));

    const salutation = document.getElementById('salutation');
    const question = document.getElementById('question');
    const messages = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const themeToggle = document.getElementById('themeToggle');
    const tempChat = document.getElementById('tempChat');
    const newChat = document.getElementById('newChat');
    const conversationsDiv = document.getElementById('conversations');
    const topSearchesDiv = document.getElementById('top-searches');
    const chatArea = document.querySelector('.chat-area');
    const tempChatIcon = document.querySelector('.temp-chat-icon');

    if (!sendBtn) {
        console.error('Send button not found! Check the ID in HTML.');
        return; // Stop execution if sendBtn is not found
    }

    if (!tempChatIcon) {
        console.error('Ghost icon not found! Check the image path or class in HTML.');
    }

    // Set chat area to natural height at start, allowing content to determine size
    if (chatArea) {
        chatArea.style.minHeight = '0';  // Allow natural height
        chatArea.style.maxHeight = 'auto';  // Remove height limitation, allow full expansion
        chatArea.style.height = 'auto';  // Start with auto height based on content
        console.log('Chat area height set to auto, max auto:', chatArea.style.height);
    } else {
        console.error('Chat area not found!');
    }

    // Greeting at start: "Good Evening, Samantha"
    salutation.textContent = 'Good Evening, Samantha.';
    question.textContent = 'How can I help you today?';

    // Theme toggle (switch between light and dark)
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        document.body.classList.toggle('dark');
        themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    });

    // Temporary chat (set greeting to "Good Evening, Anonymous" and color icon white)
    tempChat.addEventListener('click', () => {
        messages.innerHTML = ''; // Clear existing messages
        salutation.textContent = 'Good Evening, Anonymous.';
        question.textContent = 'How can I help you today?';
        salutation.style.display = 'block'; // Show greeting
        question.style.display = 'block'; // Show question
        chatArea.classList.remove('active'); // Reset to centered greeting state
        addMessage('System: Started temporary chat', 'bot');
        if (tempChatIcon) tempChatIcon.classList.add('active');
    });


    // New chat (reset to "Good Evening, Samantha" and remove white from icon)
    newChat.addEventListener('click', () => {
        messages.innerHTML = '';
        salutation.textContent = 'Good Evening, Samantha.';  // Reset greeting
        question.textContent = 'How can I help you today?';
        addMessage('System: Started new chat', 'bot');
        if (tempChatIcon) {
            tempChatIcon.classList.remove('active');  // Remove white fill
            console.log('New chat started, ghost icon reverted to black.');
        }
    });

    // Send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Conversations (exact examples from React code)
    const conversations = [
        "Latest Tech Trends",
        "Space Exploration Updates",
        "Health & Wellness Tips",
        "AI and the Future",
        "Travel Destinations 2025",
        "Best Recipes of the Year",
        "Stock Market Insights",
        "Climate Change Impact",
        "Sports Highlights",
        "Movie Recommendations"
    ];
    conversations.forEach(conv => {
        const div = document.createElement('div');
        div.className = 'conversation';
        // Split the conversation string into words and wrap each in a span,
        // then join them with a <br> so each word appears on its own line.
        div.innerHTML = conv.split(' ').map(word => `<span class="conversation-word">${word}</span>`).join(' ');
        conversationsDiv.appendChild(div);
        });
    
    // Top Searches (exact examples with title, source, verdict from React code, with diversified verdicts)
    const topSearches = [
        { text: "Aliens have landed in New York!", img: "https://via.placeholder.com/40", source: "FakeNewsDaily.com", tag: "False" },
        { text: "Government to ban all smartphones by 2026!", img: "https://via.placeholder.com/40", source: "ConspiracyWatch.net", tag: "Misleading" },
        { text: "Scientists discover immortality pill!", img: "https://via.placeholder.com/40", source: "ViralHoaxNews.com", tag: "False" },
        { text: "Moon is actually made of cheese!", img: "https://via.placeholder.com/40", source: "SatireToday.org", tag: "Satire" },
        { text: "NASA confirms water on Mars!", img: "https://via.placeholder.com/40", source: "NASA.gov", tag: "True" },
        { text: "New species of whale discovered in the Pacific!", img: "https://via.placeholder.com/40", source: "NationalGeographic.com", tag: "True" },
        { text: "Electric cars now outsell gasoline cars in Norway!", img: "https://via.placeholder.com/40", source: "BBC.com", tag: "True" }
    ];

    topSearches.forEach(search => {
        const div = document.createElement('div');
        div.className = 'news-item';
        div.innerHTML = `
            <img src="${search.img}" alt="Fake news" class="w-10 h-10 rounded">
            <div>
                <span>${search.text}</span>
                <p class="source text-sm text-gray-400">Source: ${search.source}</p>
                <p><span class="verdict">Verdict:</span> 
                    <span class="verdict-result verdict-${search.tag.toLowerCase()}">${search.tag}</span>
                </p>
            </div>
        `;
        topSearchesDiv.appendChild(div);
    });

    const conversationsHeader = document.getElementById('conversations-header');
    const topSearchesHeader = document.getElementById('top-searches-header');
  
    // Get the containers that hold the content
    const conversationsContainer = document.getElementById('conversations-container');
    const topSearchesContainer = document.getElementById('top-searches-container');
  
    // Get the sidebar elements
    const conversationsSidebar = document.getElementById('conversations-sidebar');
    const topSearchesSidebar = document.getElementById('top-searches-sidebar');


    // Toggle Conversations content on header click
    conversationsHeader.addEventListener('click', () => {
        conversationsContainer.classList.toggle('hidden');
        if (conversationsContainer.classList.contains('hidden')) {
        conversationsSidebar.classList.add('collapsed');
        } else {
        conversationsSidebar.classList.remove('collapsed');
        }
        console.log('Toggled Conversations content. Collapsed:', conversationsSidebar.classList.contains('collapsed'));
        //positionInputContainerFixed();
    });
  
    // Toggle Top Searches content on header click
    topSearchesHeader.addEventListener('click', () => {
        topSearchesContainer.classList.toggle('hidden');
        if (topSearchesContainer.classList.contains('hidden')) {
        topSearchesSidebar.classList.add('collapsed');
        } else {
        topSearchesSidebar.classList.remove('collapsed');
        }
        console.log('Toggled Top Searches content. Collapsed:', topSearchesSidebar.classList.contains('collapsed'));
        //positionInputContainerFixed();
    });
      
    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
    
        addMessage(message, 'user');
        messageInput.value = '';

        showSynapseAnimation();

        setTimeout(() => {
            fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            })
            .then(response => response.json())
            .then(data => addMessage(data.response, 'bot'))
            .catch(error => {
                addMessage('Error: Could not reach Synapse', 'bot');
                console.error(error);
            });
        }, 4000);
    
        // Check if this is the first user message and modify the chat area
        const userMessages = document.querySelectorAll('.message.user');
        if (userMessages.length === 1) {  // First user message
            const salutation = document.getElementById('salutation');
            const question = document.getElementById('question');
            const chatArea = document.querySelector('.chat-area');
            const content = document.querySelector('.content');
            
            if (salutation && question && chatArea && content) {
                salutation.style.display = 'none';  // Hide greeting
                question.style.display = 'none';  // Hide question
                chatArea.classList.add('active');  // Activate chat-area styles
                content.classList.add('active');   // Change alignment of content container
                console.log('First user message sent, greeting hidden, chat area maximized and aligned to top.');
            }
        }
    }
    
    function showSynapseAnimation() {
        const synapseEl = document.getElementById('synapse-animation');
        if (!synapseEl) return;
        
        synapseEl.style.display = 'flex';  // Show the overlay
        // After 4 seconds, hide the overlay
        setTimeout(() => {
          synapseEl.style.display = 'none';
        }, 4000);
      }
                    

    function addMessage(text, sender) {
        const message = document.createElement('div');
        message.classList.add('message', sender);
        message.textContent = text;
    
        // Append at the end
        messages.appendChild(message);
    
        // Auto-scroll to latest message
        messages.scrollTop = messages.scrollHeight;
    }    

    window.addEventListener('resize', positionInputContainer);


    // Debug logs to check if content is loaded
    console.log('Conversations loaded:', conversationsDiv.children.length);
    console.log('Top Searches loaded:', topSearchesDiv.children.length);
    console.log('Conversations HTML:', conversationsDiv.innerHTML);
    console.log('Top Searches HTML:', topSearchesDiv.innerHTML);
});