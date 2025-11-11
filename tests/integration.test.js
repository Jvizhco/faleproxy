const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');

// Set a different port for testing to avoid conflict with the main app
const TEST_PORT = 3099;
let server;

describe('Integration Tests', () => {
  // Modify the app to use a test port
  beforeAll(async () => {
    
    // Create a temporary test app file
    await execAsync('cp app.js app.test.js', { cwd: path.join(__dirname, '..') });
    await execAsync(`perl -pi -e 's/const PORT = 3001/const PORT = ${TEST_PORT}/' app.test.js`, { cwd: path.join(__dirname, '..') });
    
    // Start the test server
    server = require('child_process').spawn('node', ['app.test.js'], {
      cwd: path.join(__dirname, '..'),
      detached: true,
      stdio: 'ignore'
    });
    
    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 10000); // Increase timeout for server startup

  afterAll(async () => {
    // Kill the test server and clean up
    if (server && server.pid) {
      try {
        process.kill(-server.pid);
      } catch (err) {
        // Process might already be dead
      }
    }
    
    // Wait a bit for the server to shut down
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await execAsync('rm -f app.test.js', { cwd: path.join(__dirname, '..') });
    } catch (err) {
      // File might not exist
    }
  });

  test('Should start server and respond to requests', async () => {
    // Just verify the server is running and can handle a real request
    // Note: This makes a real HTTP request to example.com
    const response = await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
      url: 'https://example.com/'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.content).toBeTruthy();
    expect(response.data.originalUrl).toBe('https://example.com/');
  }, 10000); // Increase timeout for this test

  test('Should handle invalid URLs', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {
        url: 'not-a-valid-url'
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      if (error.response) {
        expect(error.response.status).toBe(500);
      } else {
        // Network error - server might not be ready
        throw error;
      }
    }
  });

  test('Should handle missing URL parameter', async () => {
    try {
      await axios.post(`http://localhost:${TEST_PORT}/fetch`, {});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      if (error.response) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('URL is required');
      } else {
        // Network error - server might not be ready
        throw error;
      }
    }
  });
});
