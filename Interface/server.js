const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Mock Synapse API endpoint
app.post('/chat', (req, res) => {
    const message = req.body.message;
    // This is where you'd integrate with actual Synapse model
    res.json({
        response: `Synapse: You said "${message}"`
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});