const { Pool } = require('pg');

const pool = new Pool({
  user: 'lorenaandravacarean', 
  host: 'localhost',
  database: 'synapse_chat',
  password: 'xcv42!M3v',
  port: 5432,
});

module.exports = pool;