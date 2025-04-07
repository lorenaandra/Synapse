const axios = require('axios');
const pool = require('../Backend/db_credentials');
const chalk = require('chalk');

async function testAuth() {
  const baseUrl = 'http://localhost:3000';

  // ----- Test Signup -----
  try {
    console.log('Testing signup...');
    let response = await axios.post(`${baseUrl}/api/signup`, {
      username: 'testuser',
      password: 'testpassword'
    });
    if (response.data.success) {
      console.log(chalk.green('Signup test passed: success true'));
    } else {
      console.error(chalk.red('Signup test failed:'), response.data);
    }
  } catch (err) {
    console.error(chalk.red('Signup error:'), err.response ? err.response.data : err.message);
  }

  // ----- Test Duplicate Signup (expected: Username already exists) -----
  try {
    console.log('\nTesting duplicate signup (expected: Username already exists)...');
    let response = await axios.post(`${baseUrl}/api/signup`, {
      username: 'testuser',
      password: 'testpassword'
    });
    if (!response.data.success && response.data.message === 'Username already exists') {
      console.log(chalk.green('Duplicate signup test passed: Expected error received'));
    } else {
      console.error(chalk.red('Duplicate signup test failed:'), response.data);
    }
  } catch (err) {
    console.error(chalk.red('Duplicate signup error:'), err.response ? err.response.data : err.message);
  }

  // ----- Test Login with Correct Credentials -----
  let loginResponse;
  try {
    console.log('\nTesting login (correct credentials)...');
    loginResponse = await axios.post(`${baseUrl}/api/login`, {
      username: 'testuser',
      password: 'testpassword'
    });
    if (loginResponse.data.success) {
      console.log(chalk.green('Login test passed: success true'));
    } else {
      console.error(chalk.red('Login test failed:'), loginResponse.data);
    }
  } catch (err) {
    console.error(chalk.red('Login error:'), err.response ? err.response.data : err.message);
  }

  // ----- Test Login with Incorrect Password (expected: Incorrect password) -----
  try {
    console.log('\nTesting login (expected: Incorrect password)...');
    let response = await axios.post(`${baseUrl}/api/login`, {
      username: 'testuser',
      password: 'wrongpassword'
    });
    if (!response.data.success && response.data.message === 'Incorrect password') {
      console.log(chalk.green('Incorrect password test passed: Expected error received'));
    } else {
      console.error(chalk.red('Incorrect password test failed:'), response.data);
    }
  } catch (err) {
    console.error(chalk.red('Login with wrong password error:'), err.response ? err.response.data : err.message);
  }

  // ----- Test Signout Endpoint (only if login was successful) -----
  if (loginResponse && loginResponse.data.success) {
    try {
      console.log('\nTesting signout...');
      let response = await axios.post(`${baseUrl}/api/signout`, {});
      if (response.data.success) {
        console.log(chalk.green('Signout test passed: success true'));
      } else {
        console.error(chalk.red('Signout test failed:'), response.data);
      }
    } catch (err) {
      console.error(chalk.red('Signout error:'), err.response ? err.response.data : err.message);
    }
  } else {
    console.error(chalk.red('Skipping signout test because login was not successful'));
  }

  // ----- Clean Up: Delete all users from the database -----
  try {
    console.log('\nCleaning up: Deleting all users from the database...');
    await pool.query('DELETE FROM users;');
    console.log(chalk.green('Cleanup successful: Users table cleaned.'));
  } catch (err) {
    console.error(chalk.red('Cleanup error:'), err);
  }
}

testAuth();