const pool = require('./db_credentials');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error executing query', err.stack);
  } else {
    console.log('Database connected, current time:', res.rows[0]);
  }
});