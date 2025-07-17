const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class ClaudeClient {
  constructor(workingDir = process.cwd()) {
    this.workingDir = workingDir;
    this.sessionsDir = path.join(os.homedir(), '.claude-slack-bot-sessions');
    this.threadSessions = new Map(); // threadTs -> sessionId
    this.userSessions = new Map(); // userId:channelId -> sessionId
    this.initializeSessionsDir();
  }

  async initializeSessionsDir() {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create sessions directory:', error);
    }
  }

  async executeCommand(prompt, context = {}) {
    const { userId, channel, threadTs } = context;
    
    try {
      // Determine session strategy
      const sessionId = await this.getOrCreateSession(userId, channel, threadTs);
      
      // Build Claude Code command
      const args = [
        '--print',
        '--output-format', 'json'
      ];

      // Add session continuation if we have one
      if (sessionId) {
        if (this.isNewSession(sessionId, threadTs)) {
          args.push('--resume', sessionId);
        } else {
          args.push('--continue');
        }
      }

      // Add MCP server if claude-fleet is available
      if (await this.isClaudeFleetAvailable()) {
        args.push('--mcp-server', 'claude-fleet');
      }

      // Add the prompt
      args.push(prompt);

      const response = await this.spawnClaudeProcess(args);
      
      // Update session tracking
      if (response.sessionId) {
        await this.updateSessionTracking(response.sessionId, userId, channel, threadTs);
      }

      return response;
    } catch (error) {
      console.error('Error executing Claude command:', error);
      throw error;
    }
  }

  async spawnClaudeProcess(args) {
    return new Promise((resolve, reject) => {
      const claude = spawn('claude-code', args, {
        cwd: this.workingDir,
        env: { ...process.env, TERM: 'dumb' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      claude.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claude.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claude.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Claude Code exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Parse JSON response
          const lines = stdout.trim().split('\n');
          const jsonLine = lines.find(line => {
            try {
              JSON.parse(line);
              return true;
            } catch {
              return false;
            }
          });

          if (jsonLine) {
            const response = JSON.parse(jsonLine);
            resolve(response);
          } else {
            // Fallback to plain text
            resolve({ text: stdout.trim() });
          }
        } catch (error) {
          reject(new Error(`Failed to parse Claude response: ${error.message}`));
        }
      });

      claude.on('error', (error) => {
        reject(new Error(`Failed to spawn Claude process: ${error.message}`));
      });
    });
  }

  async getOrCreateSession(userId, channel, threadTs) {
    // Priority 1: Thread-based session
    if (threadTs && this.threadSessions.has(threadTs)) {
      return this.threadSessions.get(threadTs);
    }

    // Priority 2: User-channel session
    const userChannelKey = `${userId}:${channel}`;
    if (this.userSessions.has(userChannelKey)) {
      return this.userSessions.get(userChannelKey);
    }

    // No existing session
    return null;
  }

  async updateSessionTracking(sessionId, userId, channel, threadTs) {
    // Store in thread sessions if we have a thread
    if (threadTs) {
      this.threadSessions.set(threadTs, sessionId);
    }

    // Always store in user-channel sessions as fallback
    const userChannelKey = `${userId}:${channel}`;
    this.userSessions.set(userChannelKey, sessionId);

    // Persist to filesystem
    await this.saveSessionMetadata(sessionId, {
      userId,
      channel,
      threadTs,
      createdAt: new Date().toISOString(),
      type: threadTs ? 'thread' : 'channel'
    });
  }

  async saveSessionMetadata(sessionId, metadata) {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Failed to save session metadata:', error);
    }
  }

  async loadSessionMetadata(sessionId) {
    try {
      const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  isNewSession(sessionId, threadTs) {
    // Check if this is a resumed session vs continued session
    return !this.threadSessions.has(threadTs) || 
           this.threadSessions.get(threadTs) !== sessionId;
  }

  async isClaudeFleetAvailable() {
    try {
      // Check if claude-fleet MCP server is configured
      const result = await this.spawnClaudeProcess(['--list-mcp-servers']);
      return result.text?.includes('claude-fleet') || false;
    } catch (error) {
      return false;
    }
  }

  async startNewSession(context) {
    const { userId, channel, threadTs } = context;
    
    // Clear existing sessions for this context
    if (threadTs) {
      this.threadSessions.delete(threadTs);
    }
    const userChannelKey = `${userId}:${channel}`;
    this.userSessions.delete(userChannelKey);

    // Start fresh conversation
    return await this.executeCommand('Hello! I\'m ready to help you with your project.', context);
  }

  getSessionStatus(context) {
    const { userId, channel, threadTs } = context;
    
    let sessionId = null;
    let threadBased = false;

    // Check thread session first
    if (threadTs && this.threadSessions.has(threadTs)) {
      sessionId = this.threadSessions.get(threadTs);
      threadBased = true;
    } else {
      // Check user-channel session
      const userChannelKey = `${userId}:${channel}`;
      if (this.userSessions.has(userChannelKey)) {
        sessionId = this.userSessions.get(userChannelKey);
      }
    }

    return {
      hasSession: !!sessionId,
      sessionId,
      threadBased,
      type: threadBased ? 'thread' : 'channel'
    };
  }

  async listUserSessions(userId, channel) {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const sessionId = file.replace('.json', '');
            const metadata = await this.loadSessionMetadata(sessionId);
            
            if (metadata && metadata.userId === userId && metadata.channel === channel) {
              sessions.push({
                sessionId,
                ...metadata
              });
            }
          } catch (error) {
            // Skip invalid session files
          }
        }
      }

      return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error listing user sessions:', error);
      return [];
    }
  }

  async setActiveSession(sessionId, context) {
    const { userId, channel, threadTs } = context;
    
    // Verify session exists
    const metadata = await this.loadSessionMetadata(sessionId);
    if (!metadata) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Set as active session
    if (threadTs) {
      this.threadSessions.set(threadTs, sessionId);
    }
    const userChannelKey = `${userId}:${channel}`;
    this.userSessions.set(userChannelKey, sessionId);

    return metadata;
  }

  async clearThreadSession(threadTs) {
    if (this.threadSessions.has(threadTs)) {
      this.threadSessions.delete(threadTs);
      return true;
    }
    return false;
  }

  async clearUserSession(userId, channel) {
    const userChannelKey = `${userId}:${channel}`;
    if (this.userSessions.has(userChannelKey)) {
      this.userSessions.delete(userChannelKey);
      return true;
    }
    return false;
  }
}

module.exports = ClaudeClient;