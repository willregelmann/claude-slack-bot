const ClaudeClient = require('../src/claude-client');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Integration tests that actually call Claude Code CLI (when available)
 * Uses the local Claude Code CLI configuration, no additional API keys needed
 * These tests can be skipped in CI environments without Claude Code CLI
 */
describe('Integration Tests - Real Claude CLI', () => {
  let claudeClient;
  let testDir;
  let originalSpawn;

  beforeAll(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), 'claude-slack-integration-test');
    await fs.mkdir(testDir, { recursive: true });
    
    claudeClient = new ClaudeClient(testDir);
    
    // Store original spawn function
    originalSpawn = spawn;
  });

  afterAll(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  beforeEach(() => {
    // Reset to real spawn for integration tests
    jest.unmock('child_process');
    jest.unmock('fs');
  });

  describe('Claude CLI availability', () => {
    it('should detect if Claude CLI is available', async () => {
      const isAvailable = await checkClaudeCliAvailable();
      
      if (!isAvailable) {
        console.log('⚠️  Claude CLI not available - skipping integration tests');
        return;
      }
      
      expect(isAvailable).toBe(true);
    }, 10000);

    it('should detect claude-fleet MCP server availability', async () => {
      const isClaudeAvailable = await checkClaudeCliAvailable();
      if (!isClaudeAvailable) {
        console.log('⚠️  Claude CLI not available - skipping MCP test');
        return;
      }

      const isFleetAvailable = await claudeClient.isClaudeFleetAvailable();
      
      // This might be false in test environments, which is okay
      expect(typeof isFleetAvailable).toBe('boolean');
      
      if (isFleetAvailable) {
        console.log('✅ claude-fleet MCP server detected');
      } else {
        console.log('ℹ️  claude-fleet MCP server not available');
      }
    }, 15000);
  });

  describe('Real Claude interactions', () => {
    it('should execute a simple Claude command', async () => {
      const isAvailable = await checkClaudeCliAvailable();
      if (!isAvailable) {
        console.log('⚠️  Skipping Claude interaction test - CLI not available');
        return;
      }

      const response = await claudeClient.executeCommand('Hello! Just say hi back.', {
        userId: 'test-user',
        channel: 'test-channel',
        threadTs: 'test-thread-' + Date.now()
      });

      expect(response).toBeDefined();
      expect(typeof response.text === 'string' || typeof response === 'string').toBe(true);
      
      // Claude should respond with some form of greeting
      const responseText = response.text || response;
      expect(responseText.toLowerCase()).toMatch(/hi|hello|hey|greet/);
      
      console.log('✅ Claude responded:', responseText.substring(0, 100) + '...');
    }, 30000);

    it('should handle code-related requests', async () => {
      const isAvailable = await checkClaudeCliAvailable();
      if (!isAvailable) {
        console.log('⚠️  Skipping code request test - CLI not available');
        return;
      }

      const response = await claudeClient.executeCommand(
        'Write a simple JavaScript function that adds two numbers. Keep it very short.',
        {
          userId: 'test-user',
          channel: 'test-channel',
          threadTs: 'test-thread-code-' + Date.now()
        }
      );

      expect(response).toBeDefined();
      const responseText = response.text || response;
      
      // Should contain JavaScript code
      expect(responseText).toMatch(/function|=>/);
      expect(responseText).toMatch(/\+/);
      
      console.log('✅ Claude provided code:', responseText.substring(0, 200) + '...');
    }, 30000);

    it('should maintain conversation continuity', async () => {
      const isAvailable = await checkClaudeCliAvailable();
      if (!isAvailable) {
        console.log('⚠️  Skipping continuity test - CLI not available');
        return;
      }

      const threadTs = 'test-thread-continuity-' + Date.now();
      const context = {
        userId: 'test-user',
        channel: 'test-channel',
        threadTs: threadTs
      };

      // First message
      const response1 = await claudeClient.executeCommand(
        'Remember this number: 42. Just acknowledge you will remember it.',
        context
      );

      expect(response1).toBeDefined();
      console.log('✅ First response:', (response1.text || response1).substring(0, 100));

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second message - should remember the context
      const response2 = await claudeClient.executeCommand(
        'What number did I just tell you to remember?',
        context
      );

      expect(response2).toBeDefined();
      const responseText = response2.text || response2;
      
      // Should mention 42
      expect(responseText).toMatch(/42/);
      
      console.log('✅ Continuity maintained:', responseText.substring(0, 100));
    }, 45000);
  });

  describe('Session persistence', () => {
    it('should save and restore session metadata', async () => {
      const sessionId = 'test-session-' + Date.now();
      const metadata = {
        userId: 'test-user',
        channel: 'test-channel',
        threadTs: 'test-thread',
        createdAt: new Date().toISOString(),
        type: 'thread'
      };

      await claudeClient.saveSessionMetadata(sessionId, metadata);
      const loaded = await claudeClient.loadSessionMetadata(sessionId);

      expect(loaded).toEqual(metadata);
      console.log('✅ Session metadata persisted correctly');
    });

    it('should list user sessions', async () => {
      const userId = 'test-user-' + Date.now();
      const channel = 'test-channel';

      // Create a few test sessions
      const sessions = [];
      for (let i = 0; i < 3; i++) {
        const sessionId = `test-session-${Date.now()}-${i}`;
        const metadata = {
          userId,
          channel,
          threadTs: `test-thread-${i}`,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
          type: 'thread'
        };
        
        await claudeClient.saveSessionMetadata(sessionId, metadata);
        sessions.push({ sessionId, ...metadata });
      }

      const listedSessions = await claudeClient.listUserSessions(userId, channel);

      expect(listedSessions).toHaveLength(3);
      expect(new Date(listedSessions[0].createdAt).getTime()).toBeGreaterThan(new Date(listedSessions[1].createdAt).getTime()); // Most recent first
      
      console.log('✅ Session listing works correctly');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid commands gracefully', async () => {
      const isAvailable = await checkClaudeCliAvailable();
      if (!isAvailable) {
        console.log('⚠️  Skipping error handling test - CLI not available');
        return;
      }

      // Try to execute a command that might cause issues
      try {
        const response = await claudeClient.executeCommand('', {
          userId: 'test-user',
          channel: 'test-channel'
        });
        
        // If it doesn't throw, it should at least return something
        expect(response).toBeDefined();
        console.log('✅ Empty command handled gracefully');
      } catch (error) {
        // Error is also acceptable for empty command
        expect(error).toBeInstanceOf(Error);
        console.log('✅ Empty command properly errored:', error.message);
      }
    }, 20000);
  });

  // Helper function to check if Claude CLI is available
  async function checkClaudeCliAvailable() {
    return new Promise((resolve) => {
      const child = originalSpawn('claude-code', ['--version'], {
        stdio: 'pipe'
      });

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

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!hasResponded) {
          hasResponded = true;
          child.kill();
          resolve(false);
        }
      }, 5000);
    });
  }
});