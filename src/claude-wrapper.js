const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class ClaudeWrapper {
  constructor() {
    this.sessionMap = new Map();
    this.threadSessions = new Map(); // Maps thread_ts to session info
    this.userSessions = new Map(); // Maps user-channel to latest session
    this.sessionDir = path.join(os.homedir(), '.claude-slack-bot-sessions');
    this.initializeSessionStorage();
  }

  async initializeSessionStorage() {
    try {
      await fs.mkdir(this.sessionDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create session directory:', error);
    }
  }

  async executeCommand(prompt, context = {}) {
    const { userId, channel, threadTs, sessionMode = 'auto' } = context;
    
    return new Promise((resolve, reject) => {
      const args = this.buildClaudeArgs(prompt, context);

      const claudeProcess = spawn('claude', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: { ...process.env, TERM: 'dumb' }
      });

      let output = '';
      let errorOutput = '';

      claudeProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      claudeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      claudeProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            const result = await this.processOutput(output, context);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          const error = errorOutput || `Claude process exited with code ${code}`;
          reject(new Error(error));
        }
      });

      claudeProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Claude process: ${error.message}`));
      });

      const timeout = setTimeout(() => {
        claudeProcess.kill('SIGTERM');
        reject(new Error('Claude command timed out after 60 seconds'));
      }, 60000);

      claudeProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  buildClaudeArgs(prompt, context) {
    const { sessionMode = 'auto', sessionId, threadTs, userId, channel } = context;
    const args = ['--print', '--output-format', 'json'];

    // Determine session behavior
    if (sessionMode === 'new') {
      // Start fresh session - no additional args needed
    } else if (sessionMode === 'continue') {
      args.push('--continue');
    } else if (sessionMode === 'resume' && sessionId) {
      args.push('--resume', sessionId);
    } else if (sessionMode === 'auto') {
      // Auto mode: use thread-based or user-based session continuity
      const existingSession = this.getExistingSession(threadTs, userId, channel);
      if (existingSession) {
        if (existingSession.type === 'continue') {
          args.push('--continue');
        } else if (existingSession.type === 'resume' && existingSession.sessionId) {
          args.push('--resume', existingSession.sessionId);
        }
      }
    }

    args.push(prompt);
    return args;
  }

  getExistingSession(threadTs, userId, channel) {
    // First check if there's a thread-specific session
    if (threadTs && this.threadSessions.has(threadTs)) {
      return this.threadSessions.get(threadTs);
    }

    // Then check for user-channel session
    const userKey = `${userId}-${channel}`;
    if (this.userSessions.has(userKey)) {
      return this.userSessions.get(userKey);
    }

    return null;
  }

  async processOutput(output, context) {
    try {
      const parsed = JSON.parse(output);
      
      // Store session information if available
      if (parsed.session_id) {
        await this.storeSessionInfo(parsed.session_id, context);
      }

      const formattedOutput = this.formatForSlack(parsed.result || output);
      return {
        text: formattedOutput,
        sessionId: parsed.session_id,
        usage: parsed.usage,
        cost: parsed.total_cost_usd
      };
    } catch (error) {
      // Fallback to text format if JSON parsing fails
      const formattedOutput = this.formatForSlack(output);
      return { text: formattedOutput };
    }
  }

  async storeSessionInfo(sessionId, context) {
    const { threadTs, userId, channel } = context;
    const sessionInfo = {
      sessionId,
      userId,
      channel,
      threadTs,
      createdAt: new Date().toISOString(),
      type: 'resume'
    };

    // Store in thread-specific map if in a thread
    if (threadTs) {
      this.threadSessions.set(threadTs, sessionInfo);
    }

    // Store as latest session for this user-channel
    const userKey = `${userId}-${channel}`;
    this.userSessions.set(userKey, sessionInfo);

    // Persist to filesystem for --resume functionality
    await this.persistSessionInfo(sessionInfo);
  }

  async persistSessionInfo(sessionInfo) {
    try {
      const filename = `${sessionInfo.sessionId}.json`;
      const filepath = path.join(this.sessionDir, filename);
      await fs.writeFile(filepath, JSON.stringify(sessionInfo, null, 2));
    } catch (error) {
      console.error('Failed to persist session info:', error);
    }
  }

  async setActiveSession(sessionId, context) {
    const { threadTs, userId, channel } = context;
    const sessionInfo = {
      sessionId,
      userId,
      channel,
      threadTs,
      createdAt: new Date().toISOString(),
      type: 'resume'
    };

    // Store in thread-specific map if in a thread
    if (threadTs) {
      this.threadSessions.set(threadTs, sessionInfo);
    }

    // Store as latest session for this user-channel
    const userKey = `${userId}-${channel}`;
    this.userSessions.set(userKey, sessionInfo);

    return sessionInfo;
  }

  formatForSlack(output) {
    if (!output || output.trim() === '') {
      return 'Claude returned an empty response.';
    }

    let formatted = output.trim();

    if (formatted.includes('```')) {
      return formatted;
    }

    if (this.looksLikeCode(formatted)) {
      const language = this.detectLanguage(formatted);
      return `\`\`\`${language}\n${formatted}\n\`\`\``;
    }

    if (formatted.length > 3000) {
      return formatted.substring(0, 2900) + '\n\n_[Response truncated due to length]_';
    }

    return formatted;
  }

  looksLikeCode(text) {
    const codeIndicators = [
      /^[\s]*(?:function|class|def|import|from|const|let|var|if|for|while)\s/m,
      /[{}();]\s*$/m,
      /^\s*[#\/\/]\s/m,
      /^\s*<[^>]+>/m,
      /^\s*[\w-]+:\s*[\w-]+/m
    ];
    
    return codeIndicators.some(pattern => pattern.test(text));
  }

  detectLanguage(text) {
    if (/^\s*<[^>]+>/.test(text)) return 'html';
    if (/function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=/.test(text)) return 'javascript';
    if (/def\s+\w+\s*\(|import\s+\w+|from\s+\w+/.test(text)) return 'python';
    if (/class\s+\w+|public\s+class|private\s+/.test(text)) return 'java';
    if (/#include|int\s+main|printf\(/.test(text)) return 'c';
    if (/using\s+namespace|std::|cout\s*<</.test(text)) return 'cpp';
    if (/\$\w+|\{\{\s*\w+/.test(text)) return 'bash';
    
    return '';
  }

  async startNewSession(context) {
    const { userId, channel, threadTs } = context;
    const result = await this.executeCommand('Hello! I\'m Claude, ready to help you. What would you like to work on?', {
      ...context,
      sessionMode: 'new'
    });
    
    return result;
  }

  async continueSession(context) {
    const result = await this.executeCommand(context.prompt, {
      ...context,
      sessionMode: 'continue'
    });
    
    return result;
  }

  async resumeSession(sessionId, context) {
    const result = await this.executeCommand(context.prompt, {
      ...context,
      sessionMode: 'resume',
      sessionId
    });
    
    return result;
  }

  async listUserSessions(userId, channel) {
    try {
      const files = await fs.readdir(this.sessionDir);
      const sessions = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filepath = path.join(this.sessionDir, file);
            const content = await fs.readFile(filepath, 'utf8');
            const sessionInfo = JSON.parse(content);
            
            if (sessionInfo.userId === userId && sessionInfo.channel === channel) {
              sessions.push(sessionInfo);
            }
          } catch (error) {
            console.error(`Failed to read session file ${file}:`, error);
          }
        }
      }
      
      return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  async clearThreadSession(threadTs) {
    if (threadTs && this.threadSessions.has(threadTs)) {
      this.threadSessions.delete(threadTs);
      return true;
    }
    return false;
  }

  async clearUserSession(userId, channel) {
    const userKey = `${userId}-${channel}`;
    if (this.userSessions.has(userKey)) {
      this.userSessions.delete(userKey);
      return true;
    }
    return false;
  }

  getSessionStatus(context) {
    const { threadTs, userId, channel } = context;
    const existingSession = this.getExistingSession(threadTs, userId, channel);
    
    if (existingSession) {
      return {
        hasSession: true,
        sessionId: existingSession.sessionId,
        type: existingSession.type,
        threadBased: !!threadTs && this.threadSessions.has(threadTs),
        createdAt: existingSession.createdAt
      };
    }
    
    return { hasSession: false };
  }
}

module.exports = ClaudeWrapper;