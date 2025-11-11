const request = require('supertest');
const nock = require('nock');
const { sampleHtmlWithYale } = require('./test-utils');

// Import the actual app for testing
const app = require('../app');

describe('API Endpoints', () => {
  beforeAll(() => {
    // Disable real HTTP requests during testing
    nock.disableNetConnect();
    // Allow localhost connections for supertest
    nock.enableNetConnect('127.0.0.1');
  });

  afterAll(() => {
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });

  afterEach(() => {
    // Clear any lingering nock interceptors after each test
    nock.cleanAll();
  });

  test('GET / should serve the index page', async () => {
    const response = await request(app)
      .get('/');

    expect(response.statusCode).toBe(200);
    expect(response.type).toBe('text/html');
  });

  test('POST /fetch should return 400 if URL is missing', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should fetch and replace Yale with Fale', async () => {
    // Mock the external URL
    nock('https://example.com')
      .get('/')
      .reply(200, sampleHtmlWithYale);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.title).toBe('Fale University Test Page');
    expect(response.body.content).toContain('Welcome to Fale University');
    expect(response.body.content).toContain('https://www.yale.edu/about');  // URL should be unchanged
    expect(response.body.content).toContain('>About Fale<');  // Link text should be changed
  });

  test('POST /fetch should handle errors from external sites', async () => {
    // Mock a failing URL
    nock('https://error-site.com')
      .get('/')
      .replyWithError('Connection refused');

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://error-site.com/' });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle YALE in uppercase', async () => {
    const htmlWithUppercase = '<html><body><p>YALE is great</p></body></html>';
    
    nock('https://test.com')
      .get('/')
      .reply(200, htmlWithUppercase);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://test.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.content).toContain('FALE is great');
  });

  test('POST /fetch should handle mixed case yale', async () => {
    const htmlWithMixed = '<html><body><p>yale university</p></body></html>';
    
    nock('https://test2.com')
      .get('/')
      .reply(200, htmlWithMixed);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://test2.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.content).toContain('fale university');
  });

  test('POST /fetch should handle HTML with no Yale references', async () => {
    const htmlNoYale = '<html><head><title>Test</title></head><body><p>Hello World</p><div>Some text</div></body></html>';
    
    nock('https://test3.com')
      .get('/')
      .reply(200, htmlNoYale);

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://test3.com/' });

    expect(response.statusCode).toBe(200);
    expect(response.body.content).toContain('Hello World');
    expect(response.body.title).toBe('Test');
  });
});
