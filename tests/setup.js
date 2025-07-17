// Global test setup
const path = require('path');
const os = require('os');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CLAUDE_BOT_NAME = 'TestBot';
process.env.CLAUDE_WORKING_DIR = path.join(os.tmpdir(), 'claude-slack-test');
process.env.PORT = '0'; // Use random available port

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Allow some console output for test feedback
console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (
    args[0].startsWith('✅') || 
    args[0].startsWith('⚠️') || 
    args[0].startsWith('ℹ️') ||
    args[0].includes('Claude')
  )) {
    originalConsoleLog(...args);
  }
};

console.error = (...args) => {
  // Still show actual errors
  if (args[0] instanceof Error || (args[0] && args[0].toString().includes('Error'))) {
    originalConsoleError(...args);
  }
};

console.warn = (...args) => {
  // Show warnings that start with our emoji indicators
  if (args[0] && typeof args[0] === 'string' && args[0].startsWith('⚠️')) {
    originalConsoleWarn(...args);
  }
};

// Global test utilities
global.testUtils = {
  createMockSlackMessage: (text, user = 'U123', channel = 'C123', threadTs = null) => ({
    text,
    user,
    channel,
    ts: Date.now().toString() + '.123',
    thread_ts: threadTs
  }),

  createMockSlackCommand: (text, userId = 'U123', channelId = 'C123') => ({
    text,
    user_id: userId,
    channel_id: channelId,
    command: '/claude'
  }),

  createMockSlackEvent: (text, user = 'U123', channel = 'C123', threadTs = null) => ({
    text: `<@U12345> ${text}`,
    user,
    channel,
    ts: Date.now().toString() + '.456',
    thread_ts: threadTs
  }),

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to check if Claude CLI is available
  checkClaudeAvailable: async () => {
    const { spawn } = require('child_process');
    return new Promise((resolve) => {
      const child = spawn('claude-code', ['--version'], { stdio: 'pipe' });
      let hasResponded = false;

      child.on('close', (code) => {
        if (!hasResponded) {
          hasResponded = true;
          resolve(code === 0);
        }
      });

      child.on('error', () => {
        if (!hasResponded) {
          hasResponded = true;
          resolve(false);
        }
      });

      setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          child.kill();
          resolve(false);
        }
      }, 5000);
    });
  }
};

// Global test cleanup
afterEach(() => {
  // Clear any timers or intervals
  jest.clearAllTimers();
});

beforeAll(() => {
  console.log('🧪 Starting Claude Slack Bot tests...');
});

afterAll(() => {
  console.log('🏁 Test suite completed');
});