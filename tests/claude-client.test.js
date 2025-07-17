const ClaudeClient = require('../src/claude-client');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock child_process for controlled testing
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn()
  }
}));

describe('ClaudeClient', () => {
  let claudeClient;
  let mockSpawn;
  let mockProcess;

  beforeEach(() => {
    // Reset all mocks first
    jest.clearAllMocks();
    
    // Setup spawn mock
    mockProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    
    mockSpawn = spawn;
    mockSpawn.mockReturnValue(mockProcess);
    
    // Create a temporary test directory
    const testDir = path.join(os.tmpdir(), 'claude-slack-test');
    claudeClient = new ClaudeClient(testDir);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('executeCommand', () => {
    it('should execute Claude command with basic prompt', async () => {
      // Mock successful Claude response
      const mockResponse = {
        text: 'Hello! I can help you with your project.',
        sessionId: 'test-session-123',
        cost: 0.0042
      };

      // Setup spawn to simulate successful Claude execution
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0); // Success exit code
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(JSON.stringify(mockResponse) + '\n'), 0);
        }
      });

      const promise = claudeClient.executeCommand('Hello', {
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123'
      });

      // Trigger the callbacks
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await promise;

      expect(spawn).toHaveBeenCalledWith('claude-code', [
        '--print',
        '--output-format', 'json',
        'Hello'
      ], {
        cwd: claudeClient.workingDir,
        env: expect.objectContaining({ TERM: 'dumb' }),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle Claude CLI errors gracefully', async () => {
      // Setup spawn to simulate Claude CLI error
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Error exit code
        }
      });

      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Claude CLI error: command not found'), 0);
        }
      });

      const promise = claudeClient.executeCommand('Hello', {
        userId: 'U123',
        channel: 'C123'
      });

      await expect(promise).rejects.toThrow('Claude Code exited with code 1');
    });

    it('should use --continue for existing thread sessions', async () => {
      // Setup existing thread session
      claudeClient.threadSessions.set('T123', 'existing-session-456');

      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('{"text": "Continuing conversation"}'), 0);
        }
      });

      await claudeClient.executeCommand('Follow up', {
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123'
      });

      expect(spawn).toHaveBeenCalledWith('claude-code', [
        '--print',
        '--output-format', 'json',
        '--continue',
        'Follow up'
      ], expect.any(Object));
    });

    it('should detect and use claude-fleet MCP server', async () => {
      // First mock the MCP detection call
      let callCount = 0;
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callCount++;
          if (callCount === 1) {
            // First call for MCP detection
            setTimeout(() => callback('{"text": "Available MCP servers:\\n- claude-fleet\\n- other-server"}'), 0);
          } else {
            // Second call for actual command
            setTimeout(() => callback('{"text": "Using claude-fleet"}'), 0);
          }
        }
      });

      await claudeClient.executeCommand('Hello', {
        userId: 'U123',
        channel: 'C123'
      });

      // Should be called twice: once for MCP detection, once for actual command
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(2, 'claude-code', [
        '--print',
        '--output-format', 'json',
        '--mcp-server', 'claude-fleet',
        'Hello'
      ], expect.any(Object));
    });
  });

  describe('session management', () => {
    it('should start new session and clear existing ones', async () => {
      // Setup existing sessions
      claudeClient.threadSessions.set('T123', 'old-session');
      claudeClient.userSessions.set('U123:C123', 'old-session');

      let callCount = 0;
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callCount++;
          if (callCount === 1) {
            // First call for MCP detection
            setTimeout(() => callback('{"text": "No MCP servers available"}'), 0);
          } else {
            // Second call for actual command
            setTimeout(() => callback('{"text": "New session started", "sessionId": "new-session-789"}'), 0);
          }
        }
      });

      const result = await claudeClient.startNewSession({
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123'
      });

      // The new session should have a different ID
      expect(result.sessionId).toBe('new-session-789');
      
      // The new session should be stored in the maps
      expect(claudeClient.threadSessions.get('T123')).toBe('new-session-789');
      expect(claudeClient.userSessions.get('U123:C123')).toBe('new-session-789');
    });

    it('should return correct session status', () => {
      claudeClient.threadSessions.set('T123', 'thread-session-456');
      
      const status = claudeClient.getSessionStatus({
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123'
      });

      expect(status).toEqual({
        hasSession: true,
        sessionId: 'thread-session-456',
        threadBased: true,
        type: 'thread'
      });
    });

    it('should fallback to user-channel session when no thread session', () => {
      claudeClient.userSessions.set('U123:C123', 'user-session-789');
      
      const status = claudeClient.getSessionStatus({
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T456' // Different thread, no session
      });

      expect(status).toEqual({
        hasSession: true,
        sessionId: 'user-session-789',
        threadBased: false,
        type: 'channel'
      });
    });

    it('should clear thread sessions correctly', async () => {
      claudeClient.threadSessions.set('T123', 'session-to-clear');
      
      const cleared = await claudeClient.clearThreadSession('T123');
      
      expect(cleared).toBe(true);
      expect(claudeClient.threadSessions.has('T123')).toBe(false);
    });
  });

  describe('MCP server detection', () => {
    it('should detect claude-fleet availability', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('{"text": "Available MCP servers:\n- claude-fleet\n- other-server"}'), 0);
        }
      });

      const isAvailable = await claudeClient.isClaudeFleetAvailable();
      
      expect(isAvailable).toBe(true);
      expect(spawn).toHaveBeenCalledWith('claude-code', ['--list-mcp-servers'], expect.any(Object));
    });

    it('should handle MCP server detection failure', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Error
        }
      });

      const isAvailable = await claudeClient.isClaudeFleetAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('file system operations', () => {
    it('should save and load session metadata', async () => {
      const metadata = {
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123',
        createdAt: new Date().toISOString(),
        type: 'thread'
      };

      // Mock successful file operations
      fs.writeFile.mockResolvedValue();
      fs.readFile.mockResolvedValue(JSON.stringify(metadata));

      await claudeClient.saveSessionMetadata('session-123', metadata);
      const loaded = await claudeClient.loadSessionMetadata('session-123');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session-123.json'),
        JSON.stringify(metadata, null, 2)
      );
      expect(loaded).toEqual(metadata);
    });

    it('should list user sessions correctly', async () => {
      const sessionFiles = ['session-1.json', 'session-2.json', 'session-3.json'];
      const sessions = [
        { userId: 'U123', channel: 'C123', createdAt: '2023-01-01T00:00:00.000Z' },
        { userId: 'U123', channel: 'C123', createdAt: '2023-01-02T00:00:00.000Z' },
        { userId: 'U456', channel: 'C123', createdAt: '2023-01-03T00:00:00.000Z' }
      ];

      fs.readdir.mockResolvedValue(sessionFiles);
      fs.readFile.mockImplementation((filePath) => {
        const fileName = path.basename(filePath, '.json');
        const sessionIndex = parseInt(fileName.split('-')[1]) - 1;
        return Promise.resolve(JSON.stringify(sessions[sessionIndex]));
      });

      const userSessions = await claudeClient.listUserSessions('U123', 'C123');

      expect(userSessions).toHaveLength(2);
      expect(userSessions[0].createdAt).toBe('2023-01-02T00:00:00.000Z'); // Most recent first
      expect(userSessions[1].createdAt).toBe('2023-01-01T00:00:00.000Z');
    });
  });
});