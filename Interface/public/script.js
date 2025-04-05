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
        return; 
    }

    if (!tempChatIcon) {
        console.error('Ghost icon not found! Check the image path or class in HTML.');
    }

    function getTimeBasedGreeting(name = 'friend') {
        const hour = new Date().getHours();
    
        let greeting;
        if (hour >= 5 && hour < 12) {
            greeting = 'Good Morning';
        } else if (hour >= 12 && hour < 17) {
            greeting = 'Good Afternoon';
        } else if (hour >= 17 && hour < 22) {
            greeting = 'Good Evening';
        } else {
            greeting = 'Are you an owl? 🦉 Hello';
        }
    
        return `${greeting}, ${name}.`;
    }
    

    // set chat area to natural height at start, allowing content to determine size
    if (chatArea) {
        chatArea.style.minHeight = '0';  // allow natural height
        chatArea.style.maxHeight = 'auto';  // remove height limitation, allow full expansion
        chatArea.style.height = 'auto'; 
        console.log('Chat area height set to auto, max auto:', chatArea.style.height);
    } else {
        console.error('Chat area not found!');
    }

    salutation.textContent = getTimeBasedGreeting();
    question.textContent = 'How can I help you today?';

    // theme toggle 
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');
        document.body.classList.toggle('dark');
        themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    });

    // temporary chat 
    tempChat.addEventListener('click', () => {
        messages.innerHTML = ''; // clear existing messages
        salutation.textContent = getTimeBasedGreeting('Anonymous');
        question.textContent = 'How can I help you today?';

        salutation.style.display = 'block'; 
        question.style.display = 'block';

        chatArea.classList.remove('active');
        document.querySelector('.content').classList.remove('active');
        chatArea.classList.add('temp-chat'); 
        console.log('System: Started temporary chat', 'bot');
        if (tempChatIcon) tempChatIcon.classList.add('active');
    });    

    // new chat 
    newChat.addEventListener('click', () => {
        messages.innerHTML = '';
        salutation.textContent = getTimeBasedGreeting();
        question.textContent = 'How can I help you today?';

        salutation.style.display = 'block';
        question.style.display = 'block';

        console.log('System: Started new chat', 'bot');

        chatArea.classList.remove('active');
        chatArea.classList.remove('temp-chat');
        document.querySelector('.content').classList.remove('active');
        
        document.querySelectorAll('.message.user').forEach(msg => {
            msg.style.border = '';
        });

        if (tempChatIcon) {
            tempChatIcon.classList.remove('active'); 
            console.log('New chat started');
        }
    });   
    
    // send message
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // random examples of convos
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
        // split the conversation string into words and wrap each in a span,
        // then join them with a <br> so each word appears on its own line.
        div.innerHTML = conv.split(' ').map(word => `<span class="conversation-word">${word}</span>`).join(' ');
        conversationsDiv.appendChild(div);
        });
    
    // top searches 
    const topSearches = [
        { text: "Aliens have landed in New York!", img: "/images/fake-news-icon.png", source: "FakeNewsDaily.com", tag: "False" },
        { text: "Government to ban all smartphones by 2026!", img: "/images/fake-news-icon.png", source: "ConspiracyWatch.net", tag: "Misleading" },
        { text: "Scientists discover immortality pill!", img: "/images/fake-news-icon.png", source: "ViralHoaxNews.com", tag: "False" },
        { text: "Moon is actually made of cheese!", img: "/images/fake-news-icon.png", source: "SatireToday.org", tag: "Satire" },
        { text: "NASA confirms water on Mars!", img: "/images/fake-news-icon.png", source: "NASA.gov", tag: "True" },
        { text: "New species of whale discovered in the Pacific!", img: "/images/fake-news-icon.png", source: "NationalGeographic.com", tag: "True" },
        { text: "Electric cars now outsell gasoline cars in Norway!", img: "/images/fake-news-icon.png", source: "BBC.com", tag: "True" }
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
  
    const conversationsContainer = document.getElementById('conversations-container');
    const topSearchesContainer = document.getElementById('top-searches-container');
  
    const conversationsSidebar = document.getElementById('conversations-sidebar');
    const topSearchesSidebar = document.getElementById('top-searches-sidebar');


    // toggle conversations sidebar
    conversationsHeader.addEventListener('click', () => {
        conversationsContainer.classList.toggle('hidden');
        if (conversationsContainer.classList.contains('hidden')) {
        conversationsSidebar.classList.add('collapsed');
        } else {
        conversationsSidebar.classList.remove('collapsed');
        }
        console.log('Toggled Conversations content. Collapsed:', conversationsSidebar.classList.contains('collapsed'));
    });
  
    // toggle top searches sidebar
    topSearchesHeader.addEventListener('click', () => {
        topSearchesContainer.classList.toggle('hidden');
        if (topSearchesContainer.classList.contains('hidden')) {
        topSearchesSidebar.classList.add('collapsed');
        } else {
        topSearchesSidebar.classList.remove('collapsed');
        }
        console.log('Toggled Top Searches content. Collapsed:', topSearchesSidebar.classList.contains('collapsed'));
    });

    // chatbot thoughts
    let messageInterval;

    function showBotAnimation() {
        const animationBubble = document.createElement('div');
        animationBubble.id = 'bot-animation'; // Ensure unique ID
        animationBubble.className = 'bot-animation';
        animationBubble.innerHTML = `
          <div class="triangle-container">
            <div class="dot dot1"></div>
            <div class="dot dot2"></div>
            <div class="dot dot3"></div>
          </div>
          <div class="triangle-text">Forming a thought…</div>
        `;
        
        const messages = document.getElementById('messages');
        messages.appendChild(animationBubble);
        messages.scrollTop = messages.scrollHeight;

        const botMessages = [
            "Forming a thought...",
            "Creating a synapse...",
            "Thinking outside the black box...",
            "Asking Schrödinger's cat...",
            "Drawing from deep memory...",
            "Consulting the archives...",
            "Training my thoughts...",
            "Running inference...",
            "Aligning my vectors...",
            "Hmm, let me think...",
            "Just a sec...",
            "On it!",
            "Typing...",
            "Searching for meaning...",
            "Summoning words...",
            "One brain cell left...",
            "Translating thoughts in human language...",
            "Sharpening my truth sword...",
            "Loading sarcasm filter...",
            "Fact-checking like Trump said it...",
            "Searching for the truth... and snacks.",
            "Disarming fake news bombs...",
            "Calling the FBI...",
            "Tuning in to BS frequency...",
            "Dusting off my lie detector...",
            "Peeking behind the viral curtain...",
            "Wondering if this is true...",
            "Sniffing out shady facts...",
            "Putting this claim under the truth microscope...",
            "Running a background check on reality...",
            "Putting on my tinfoil-proof helmet...",
            "Wrestling the facts out of chaos...",
            "Roasting this rumor slowly...",
            "Fact-finding mission: initiated 🚀",
            "Checking if this claim is fact... or fan fiction.",
            "Breaking out the digital magnifying glass...",
            "Found truth serum...",
            "Unraveling the plot twist...",
            "Turning over every shady pixel...",
            "Giving this claim the side-eye...",
            "Truth or dare? I pick truth.",
            "Flipping this story on its head...",
            "Fact-checking in progress...",
            "Interrogating people...",
            "Peeling back the layers of misinformation...",
            "Sorting truth from fiction...",
            "Scanning the dark web...",
            "Consulting trusted sources...",
            "Digging into the data...",
            "Running a credibility scan...",
            "Separating signal from noise...",
            "Detecting bias patterns...",
            "Looking behind the headlines...",
            "Brushing off the fake dust...",
            "Calling out the clickbait...",
            "Searching the truth archives...",
            "Debunking in real time...",
            "Analyzing source reliability...",
            "Filtering out the nonsense...",
            "Verifying like a digital detective...",
            "Dissecting the claim...",
            "Turning on the BS detector...",
            "Cross-referencing reality...",
            "Checking facts, not feelings...",
            "Fighting the fake one byte at a time...",
            "Checking with the truth department...",
            "Tracking the origin of the claim...",
            "Analyzing context and nuance...",
            "Staring misinformation in the face...",
            "Bringing the receipts...",
            "Searching for trustworthy trails...",
            "Crunching the numbers...",
            "Tuning my parameters...",
            "Pulling facts from the void...",
            "Running a mental update...",
            "Unpacking the data...",
            "Loading consciousness...",
            "Googling my brain...",
            "Searching the matrix...",
            "Debugging the universe...",
            "Reaching into the data abyss...",
            "Consulting my inner oracle...",
            "Warming up my circuits...",
            "Charging up thought coils...",
            "Calling the thought API...",
            "Parsing reality...",
            "Thinking in 0101...",
            "Engaging simulation mode...",
            "Just feeding the squirrels in my brain...",
            "Navigating the multiverse of ideas...",
            "Contacting headquarters...",
            "Calling Trump...",
            "Generating witty response...",
            "Decoding your request...",
            "Quantum processing initiated...",
            "Reconstructing logic...",
            "Synthesizing thought patterns...",
            "One neuron to rule them all..."
        ];

        const triangleText = animationBubble.querySelector('.triangle-text');

        messageInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * botMessages.length);
            triangleText.textContent = botMessages[randomIndex];
        }, 1500);
    }
      
    function hideBotAnimation() {
        const anim = document.getElementById('bot-animation');
        if (anim) {
            anim.remove();
        }

        if (messageInterval) {
            clearInterval(messageInterval);
            messageInterval = null;
        }
    }      
      



    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
    
        addMessage(message, 'user');
        messageInput.value = '';

        showBotAnimation();

        /// raspunsu il iau aici!!! tre sa fie in data.response
        // send the fetch request for the model response
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
        })
        .finally(() => {
            // when the model response is received, hide the animation
           //hideBotAnimation();
        });    


        // check if this is the first user message and modify the chat area
        const userMessages = document.querySelectorAll('.message.user');
        if (userMessages.length === 1) {  
            const salutation = document.getElementById('salutation');
            const question = document.getElementById('question');
            const chatArea = document.querySelector('.chat-area');
            const content = document.querySelector('.content');
            
            if (salutation && question && chatArea && content) {
                salutation.style.display = 'none';  
                question.style.display = 'none'; 
                chatArea.classList.add('active'); 
                content.classList.add('active');  
                console.log('First user message sent, greeting hidden, chat area maximized and aligned to top.');
            }
        }
    }
    
    function addMessage(text, sender) {
        const message = document.createElement('div');
        message.classList.add('message', sender);
        message.textContent = text;
        messages.appendChild(message);
        // auto-scroll to last message
        messages.scrollTop = messages.scrollHeight;
    }    

    // debugging
    console.log('Conversations loaded:', conversationsDiv.children.length);
    console.log('Top Searches loaded:', topSearchesDiv.children.length);
    console.log('Conversations HTML:', conversationsDiv.innerHTML);
    console.log('Top Searches HTML:', topSearchesDiv.innerHTML);
});