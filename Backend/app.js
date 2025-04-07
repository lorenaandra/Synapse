// app.js (Node.js/Express example)
const express = require('express');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');
const pool = require('./db_credentials');
const app = express();

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../Interface/public')));


app.post('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test route reached' });
});

//// SIGNUP ENDPOINT
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    // check if username already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.json({ success: false, message: 'Username already exists' });
    }
    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    // case of ok new user -> insert new user in database
    await pool.query(
      'INSERT INTO users (username, hashed_password) VALUES ($1, $2)',
      [username, hashedPassword]
    );
  
    res.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    res.json({ success: false, message: 'Error creating user' });
  }
});

//// LOGIN ENDPOINT
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // check if username exists
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length === 0) {
      return res.json({ success: false, message: 'User not found'});
    }
    // check if password is correct
    const passwordMatch = await bcrypt.compare(password, userCheck.rows[0].hashed_password);
    if (!passwordMatch) {
      return res.json({success: false, message: 'Incorrect password'});
    }
    // case of ok login -> send success
    res.json({success: true});
  } catch (err) {
    console.error('Login error:', err);
    res.json({success: false, message: 'Error during login'});
  }
});


//// SIGN OUT ENDPOINT
app.post('/api/signout', (req, res) => {
  res.json({ success: true, message: 'Signed out successfully' });
});

// any route that isn't matched by an API endpoint -> serve index.html
app.get('*name', (req, res) => {
  const indexPath = path.join(__dirname, '../Interface/views/index.html');
  console.log('Serving index from:', indexPath);
  res.sendFile(indexPath);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
