# Synapse
![alt text](https://github.com/lorenaandra/Synapse/blob/main/Interface/public/images/synapse-logo.png)

Synapse is an artificial intelligence chatbot presented as a web application built with Node.js, Express, and PostgreSQL. Its entire purpose is to support users in claim verification based on an existing database and internet searches. The app supports user authentication (sign‑up, sign‑in, and sign‑out) behind a profile icon. Users can chat as registered users or continue anonymously. This repository includes both the backend API endpoints and the front‑end implementation, with future plans to integrate a chatbot model.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation and Setup](#installation-and-setup)
- [Usage Flow](#usage-flow)
- [API Endpoints](#api-endpoints)

## Features

- **User Authentication:**  
  Users can sign up and sign in using a username and password.  
  The profile icon toggles an authentication form; when signed in, it shows a sign‑out option.

- **Ephemeral Anonymous Chats:**  
  By default, users are considered “Anonymous” if they don’t sign in. Anonymous chat sessions remain active only during the conversation and are not stored.

- **Chat Interface:**  
  The main chat area displays greetings based on the time of day and, when a conversation starts, transitions to a typical chat interface.

- **API Endpoints:**  
  For now: RESTful endpoints for user signup, login, signout, and a test endpoint for quick verification.

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL  
- **Authentication:** bcrypt for password hashing; localStorage on the client for session management  
- **Frontend:** HTML, CSS, and vanilla JavaScript  
- **Testing:** Axios for endpoint testing, with sample test scripts

## Installation and Setup

1. **Clone the Repository:**

   ```bash
   git clone <repository-url>
   cd <repository-folder>

2. **Set up PostgreSQL**
- Install PostgreSQL (via Postgres.app or Homebrew).
- Create a new database called synapse_chat:

    ```sql 
    CREATE DATABASE synapse_chat;
    -- Users table
    CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Conversations table
    CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
    );

    -- Messages table
    CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL,  -- e.g., 'user' or 'bot'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
    );
    ```

- Configure Database Connection in db_credentials.js:
    ```js
    const { Pool } = require('pg');

    const pool = new Pool({
    user: 'your_postgres_username',
    host: 'localhost',
    database: 'synapse_chat',
    password: 'your_postgres_password',
    port: 5432,
    });

    module.exports = pool;
    ```

- Install Dependencies: 
    ```bash
    npm install express bcrypt body-parser axios chalk pg
    ```

- Run the Backend Server: 
    ```bash
    node app.js
    ```

- Run the Frontend:
    Website should be available at http://localhost:3000/


## Usage Flow
**1. Homepage & Header:**
When you open the app, the homepage displays with the Synapse logo, a greeting, and control icons. The profile (account) icon hides the authentication form.
	
**2. Authentication:**
	•	Sign In / Sign Up:
When not signed in, clicking the profile icon toggles an auth form where users can choose between signing in (enter username and password) or signing up (enter username, password, and confirm password).
	•	Persistent Login:
When users successfully log in, their username is stored in localStorage, and the greeting is updated accordingly.
	•	Sign Out:
If the user is signed in, clicking the profile icon shows only the sign-out option. When clicked, it calls the /api/signout endpoint and resets the user to “Anonymous.”
	
**3. Chatting:**
The chat area greets the user by name (or as Anonymous) and becomes active once the user starts a conversation.

**4. API Endpoints:**
The backend provides endpoints for testing and processing signup, login, and signout actions.


