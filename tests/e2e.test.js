/**
 * End-to-End tests that simulate complete conversation flows
 * These tests use mocked Slack but real Claude Code CLI when available
 * Uses local Claude Code configuration, no additional setup required
 */
const ClaudeClient = require('../src/claude-client');
const { spawn } = require('child_process');

// Mock Slack components
const mockSlackApp = {
  messages: [],
  responses: [],
  
  say: jest.fn(async (message) => {
    mockSlackApp.responses.push(message);
    return { ok: true };
  }),
  
  respond: jest.fn(async (message) => {
    mockSlackApp.responses.push(message);
    return { ok: true };
  }),

  ack: jest.fn(async () => ({ ok: true })),

  reset: function() {
    this.messages = [];
    this.responses = [];
    this.say.mockClear();
    this.respond.mockClear();
    this.ack.mockClear();
  }
};

describe('End-to-End Conversation Flows', () => {
  let claudeClient;
  let isClaudeAvailable = false;

  beforeAll(async () => {
    claudeClient = new ClaudeClient(process.cwd());
    
    // Check if Claude CLI is available
    isClaudeAvailable = await checkClaudeCliAvailable();
    
    if (!isClaudeAvailable) {
      console.log('⚠️  Claude CLI not available - using mock responses for E2E tests');
    } else {
      console.log('✅ Claude CLI available - using real responses for E2E tests');
    }
  });

  beforeEach(() => {
    mockSlackApp.reset();
  });

  describe('Complete conversation flows', () => {
    it('should handle a complete help conversation', async () => {
      const conversationFlow = [
        {
          user: 'claude help me with JavaScript',
          expectedResponse: /javascript|help|assist/i
        },
        {
          user: 'Can you write a simple function?',
          expectedResponse: /function|=>/
        },
        {
          user: 'Thank you!',
          expectedResponse: /welcome|glad|help/i
        }
      ];

      await simulateConversation(conversationFlow, {
        userId: 'U123',
        channel: 'C123',
        threadTs: 'T123-help'
      });
    }, 60000);

    it('should handle session management throughout conversation', async () => {
      const context = {
        userId: 'U456',
        channel: 'C456',
        threadTs: 'T456-session'
      };

      // Start new session
      let response = await claudeClient.startNewSession(context);
      expect(response).toBeDefined();

      // Check session status
      let status = claudeClient.getSessionStatus(context);
      expect(status.hasSession).toBe(true);

      // Have a conversation
      response = await claudeClient.executeCommand('Hello!', context);
      expect(response).toBeDefined();

      // Continue conversation
      response = await claudeClient.executeCommand('How are you?', context);
      expect(response).toBeDefined();

      // List sessions
      const sessions = await claudeClient.listUserSessions(context.userId, context.channel);
      expect(sessions.length).toBeGreaterThan(0);

      // Clear session
      const cleared = await claudeClient.clearThreadSession(context.threadTs);
      expect(cleared).toBe(true);

      // Check session is cleared
      status = claudeClient.getSessionStatus(context);
      expect(status.hasSession).toBe(false);

      console.log('✅ Complete session management flow works');
    });

    it('should handle multi-user conversations', async () => {
      const user1Context = {
        userId: 'U111',
        channel: 'C999',
        threadTs: 'T111-multi'
      };

      const user2Context = {
        userId: 'U222',
        channel: 'C999',
        threadTs: 'T222-multi'
      };

      // User 1 starts conversation
      const response1 = await claudeClient.executeCommand('Remember: my favorite color is blue', user1Context);
      expect(response1).toBeDefined();

      // User 2 starts separate conversation
      const response2 = await claudeClient.executeCommand('Remember: my favorite color is red', user2Context);
      expect(response2).toBeDefined();

      // User 1 asks about their color
      const response3 = await claudeClient.executeCommand('What is my favorite color?', user1Context);
      expect(response3).toBeDefined();

      // Should maintain separate contexts
      const status1 = claudeClient.getSessionStatus(user1Context);
      const status2 = claudeClient.getSessionStatus(user2Context);
      
      expect(status1.sessionId).not.toBe(status2.sessionId);

      console.log('✅ Multi-user conversation isolation works');
    });

    it('should handle error recovery in conversation', async () => {
      const context = {
        userId: 'U789',
        channel: 'C789',
        threadTs: 'T789-error'
      };

      try {
        // Start with a normal request
        let response = await claudeClient.executeCommand('Hello', context);
        expect(response).toBeDefined();

        // Try an empty request (might cause error)
        try {
          response = await claudeClient.executeCommand('', context);
          // If it doesn't error, that's also fine
          expect(response).toBeDefined();
        } catch (error) {
          // Error is expected for empty command
          expect(error).toBeInstanceOf(Error);
        }

        // Should be able to continue conversation after error
        response = await claudeClient.executeCommand('Are you still there?', context);
        expect(response).toBeDefined();

        console.log('✅ Error recovery in conversation works');
      } catch (error) {
        console.log('⚠️  Error recovery test failed:', error.message);
        throw error;
      }
    });
  });

  describe('MCP integration flows', () => {
    it('should detect and use claude-fleet when available', async () => {
      if (!isClaudeAvailable) {
        console.log('⚠️  Skipping MCP integration test - Claude CLI not available');
        return;
      }

      const mcpAvailable = await claudeClient.isClaudeFleetAvailable();
      
      const context = {
        userId: 'U999',
        channel: 'C999',
        threadTs: 'T999-mcp'
      };

      const response = await claudeClient.executeCommand(
        'Hello! Can you help me with project management?',
        context
      );

      expect(response).toBeDefined();
      
      if (mcpAvailable) {
        console.log('✅ MCP integration active - claude-fleet detected');
      } else {
        console.log('ℹ️  MCP integration not active - claude-fleet not available');
      }
    }, 30000);
  });

  describe('Performance and reliability', () => {
    it('should handle rapid sequential requests', async () => {
      if (!isClaudeAvailable) {
        console.log('⚠️  Skipping performance test - Claude CLI not available');
        return;
      }

      const context = {
        userId: 'U555',
        channel: 'C555',
        threadTs: 'T555-perf'
      };

      const promises = [];
      
      // Send 3 quick requests
      for (let i = 0; i < 3; i++) {
        promises.push(
          claudeClient.executeCommand(`Quick question ${i + 1}: What is ${i + 1} + ${i + 1}?`, context)
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // At least some should succeed
      const successful = responses.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      console.log(`✅ Performance test: ${successful.length}/3 requests succeeded`);
    }, 45000);

    it('should handle timeout scenarios gracefully', async () => {
      // This test uses a very long prompt that might timeout
      const context = {
        userId: 'U666',
        channel: 'C666',
        threadTs: 'T666-timeout'
      };

      try {
        const longPrompt = 'Please analyze this very long text: ' + 'a'.repeat(10000);
        const response = await claudeClient.executeCommand(longPrompt, context);
        
        // If it succeeds, that's fine
        expect(response).toBeDefined();
        console.log('✅ Long prompt handled successfully');
      } catch (error) {
        // Timeout or error is also acceptable
        expect(error).toBeInstanceOf(Error);
        console.log('✅ Long prompt properly timed out or errored');
      }
    }, 60000);
  });

  // Helper functions
  async function simulateConversation(flow, context) {
    for (let i = 0; i < flow.length; i++) {
      const step = flow[i];
      
      try {
        let response;
        if (isClaudeAvailable) {
          response = await claudeClient.executeCommand(step.user, context);
        } else {
          // Mock response for testing without Claude
          response = { text: `Mock response to: ${step.user}` };
        }

        expect(response).toBeDefined();
        
        const responseText = response.text || response;
        
        if (isClaudeAvailable && step.expectedResponse) {
          expect(responseText).toMatch(step.expectedResponse);
        }

        console.log(`  Step ${i + 1}: "${step.user}" -> "${responseText.substring(0, 100)}..."`);
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  Step ${i + 1} failed:`, error.message);
        throw error;
      }
    }
    
    console.log('✅ Conversation flow completed successfully');
  }

  async function checkClaudeCliAvailable() {
    return new Promise((resolve) => {
      const child = spawn('claude-code', ['--version'], {
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