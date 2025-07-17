const { App } = require('@slack/bolt');
const ClaudeClient = require('../src/claude-client');

// Mock Slack Bolt
jest.mock('@slack/bolt');
jest.mock('../src/claude-client');

describe('Slack Bot Integration', () => {
  let mockApp;
  let mockClaudeClient;
  let handlers = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    handlers = {};

    // Mock Slack App
    mockApp = {
      message: jest.fn(),
      event: jest.fn(),
      start: jest.fn().mockResolvedValue()
    };
    App.mockReturnValue(mockApp);

    // Mock Claude Client
    mockClaudeClient = {
      executeCommand: jest.fn(),
      startNewSession: jest.fn(),
      getSessionStatus: jest.fn(),
      listUserSessions: jest.fn(),
      setActiveSession: jest.fn(),
      clearThreadSession: jest.fn(),
      clearUserSession: jest.fn()
    };
    ClaudeClient.mockReturnValue(mockClaudeClient);

    // Capture handlers when they're registered
    mockApp.message.mockImplementation((pattern, handler) => {
      const patternStr = pattern.toString();
      if (patternStr.includes('claude\\s+(.*)')) {
        handlers.messageHandler = handler;
      } else if (patternStr.includes('session.*new')) {
        handlers.sessionNewHandler = handler;
      } else if (patternStr.includes('session.*list')) {
        handlers.sessionListHandler = handler;
      } else if (patternStr.includes('session.*resume')) {
        handlers.sessionResumeHandler = handler;
      } else if (patternStr.includes('session.*clear')) {
        handlers.sessionClearHandler = handler;
      }
    });
    
    // No slash commands in simplified version
    
    mockApp.event.mockImplementation((event, handler) => {
      if (event === 'app_mention') {
        handlers.mentionHandler = handler;
      }
    });

    // Require the module after mocking to register handlers
    delete require.cache[require.resolve('../src/index.js')];
    require('../src/index.js');
  });

  describe('Message handling', () => {
    it('should handle claude prefix messages', async () => {
      // Setup Claude response
      mockClaudeClient.executeCommand.mockResolvedValue({
        text: 'Hello! I can help you.',
        sessionId: 'session-123',
        cost: 0.0042
      });

      // Mock Slack message event
      const mockSay = jest.fn();
      const message = {
        text: 'claude help me debug this function',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.123'
      };
      const context = { matches: ['help me debug this function'] };

      // Execute the handler
      await handlers.messageHandler({ message, say: mockSay, context });

      expect(mockClaudeClient.executeCommand).toHaveBeenCalledWith('help me debug this function', {
        userId: 'U123',
        channel: 'C123',
        threadTs: '1234567890.123'
      });

      expect(mockSay).toHaveBeenCalledWith({
        text: 'Processing your request...',
        thread_ts: '1234567890.123'
      });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('Hello! I can help you.'),
        thread_ts: '1234567890.123'
      });
    });


    it('should handle app mentions', async () => {
      mockClaudeClient.executeCommand.mockResolvedValue({
        text: 'Mentioned response',
        sessionId: 'session-789'
      });

      const mockSay = jest.fn();
      const event = {
        text: '<@U12345> explain this code',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.456'
      };


      await handlers.mentionHandler({ event, say: mockSay });

      expect(mockClaudeClient.executeCommand).toHaveBeenCalledWith('explain this code', {
        userId: 'U123',
        channel: 'C123',
        threadTs: '1234567890.456'
      });
    });
  });

  describe('Session management commands', () => {

    it('should handle session new command', async () => {
      mockClaudeClient.startNewSession.mockResolvedValue({
        text: 'New session started',
        sessionId: 'new-session-123'
      });

      const mockSay = jest.fn();
      const message = {
        text: 'session new',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.789'
      };


      await handlers.sessionNewHandler({ message, say: mockSay });

      expect(mockClaudeClient.startNewSession).toHaveBeenCalledWith({
        userId: 'U123',
        channel: 'C123',
        threadTs: '1234567890.789'
      });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('🆕 Started a new Claude session!'),
        thread_ts: '1234567890.789'
      });
    });

    it('should handle session list command', async () => {
      const mockSessions = [
        {
          sessionId: 'session-1',
          createdAt: '2023-01-01T10:00:00Z',
          threadTs: 'T123'
        },
        {
          sessionId: 'session-2',
          createdAt: '2023-01-01T09:00:00Z'
        }
      ];

      mockClaudeClient.listUserSessions.mockResolvedValue(mockSessions);

      const mockSay = jest.fn();
      const message = {
        text: 'session list',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.999'
      };


      await handlers.sessionListHandler({ message, say: mockSay });

      expect(mockClaudeClient.listUserSessions).toHaveBeenCalledWith('U123', 'C123');
      
      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('📋 Your recent Claude sessions:'),
        thread_ts: '1234567890.999'
      });
    });

    it('should handle session resume command', async () => {
      mockClaudeClient.setActiveSession.mockResolvedValue({
        sessionId: 'resumed-session-456'
      });

      const mockSay = jest.fn();
      const message = {
        text: 'session resume abc123def',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.111'
      };
      const context = { matches: ['abc123def'] };


      await handlers.sessionResumeHandler({ message, say: mockSay, context });

      expect(mockClaudeClient.setActiveSession).toHaveBeenCalledWith('abc123def', {
        userId: 'U123',
        channel: 'C123',
        threadTs: '1234567890.111'
      });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringContaining('🔄 Resuming session abc123de'),
        thread_ts: '1234567890.111'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle Claude execution errors gracefully', async () => {
      mockClaudeClient.executeCommand.mockRejectedValue(new Error('Claude CLI not found'));

      const mockSay = jest.fn();
      const message = {
        text: 'claude help me',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.222'
      };
      const context = { matches: ['help me'] };


      await handlers.messageHandler({ message, say: mockSay, context });

      expect(mockSay).toHaveBeenCalledWith({
        text: 'Sorry, I encountered an error: Claude CLI not found',
        thread_ts: '1234567890.222'
      });
    });

    it('should handle session management errors', async () => {
      mockClaudeClient.startNewSession.mockRejectedValue(new Error('Session creation failed'));

      const mockSay = jest.fn();
      const message = {
        text: 'session new',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.333'
      };

      // The session new handler is already registered in the main beforeEach


      await handlers.sessionNewHandler({ message, say: mockSay });

      expect(mockSay).toHaveBeenCalledWith({
        text: 'Sorry, I couldn\'t start a new session: Session creation failed',
        thread_ts: '1234567890.333'
      });
    });
  });

  describe('Response formatting', () => {
    it('should format responses with bot name and session info', async () => {
      mockClaudeClient.executeCommand.mockResolvedValue({
        text: 'Here is your code',
        sessionId: 'very-long-session-id-12345',
        cost: 0.0123
      });

      const mockSay = jest.fn();
      const message = {
        text: 'claude write code',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.444'
      };
      const context = { matches: ['write code'] };

      // Set environment variable for bot name
      process.env.CLAUDE_BOT_NAME = 'TestBot';


      await handlers.messageHandler({ message, say: mockSay, context });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringMatching(/Here is your code.*\[TestBot\].*Session: very-lon.*Cost: \$0\.0123/s),
        thread_ts: '1234567890.444'
      });
    });

    it('should handle responses without session info', async () => {
      mockClaudeClient.executeCommand.mockResolvedValue({
        text: 'Simple response'
      });

      const mockSay = jest.fn();
      const message = {
        text: 'claude hello',
        user: 'U123',
        channel: 'C123',
        ts: '1234567890.555'
      };
      const context = { matches: ['hello'] };


      await handlers.messageHandler({ message, say: mockSay, context });

      expect(mockSay).toHaveBeenCalledWith({
        text: expect.stringMatching(/Simple response.*\[Claude\]/s),
        thread_ts: '1234567890.555'
      });
    });
  });
});