require('dotenv').config();
const { App } = require('@slack/bolt');
const ClaudeClient = require('./claude-client');

// Get configuration from environment
const botName = process.env.CLAUDE_BOT_NAME || 'Claude';
const workingDir = process.env.CLAUDE_WORKING_DIR || process.cwd();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const claudeClient = new ClaudeClient(workingDir);

// Track threads where the bot has responded
const activeThreads = new Set();

// Handle all direct messages and messages in channels/threads where bot should respond
app.message(async ({ message, say, next }) => {
  // Skip if it's a bot message
  if (message.bot_id) {
    return next();
  }
  
  // Skip if it contains a mention (will be handled by app_mention)
  if (message.text?.includes('<@')) {
    return next();
  }
  
  // Skip if it's a session command (handled by specific session handlers)
  if (message.text?.match(/^(?:claude\s+)?session\s+/)) {
    return next();
  }

  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  const prompt = message.text;
  
  // Determine if we should respond to this message
  const shouldRespond = await determineIfShouldRespond(message, userId, threadTs);
  
  if (!shouldRespond) {
    return next();
  }
  
  try {
    await say({
      text: `Processing your request...`,
      thread_ts: threadTs
    });

    const response = await claudeClient.executeCommand(prompt, {
      userId,
      channel: message.channel,
      threadTs: threadTs
    });

    let responseText = response.text || response;
    
    // Add bot identification and session info
    let footer = `\n\n_[${botName}]_`;
    if (response.sessionId) {
      footer += ` | _Session: ${response.sessionId.substring(0, 8)}..._`;
      if (response.cost) {
        footer += ` | _Cost: $${response.cost.toFixed(4)}_`;
      }
    }
    responseText += footer;

    await say({
      text: responseText,
      thread_ts: threadTs
    });
    
    // Track this thread as active
    activeThreads.add(threadTs);
  } catch (error) {
    console.error('Error processing message:', error);
    await say({
      text: `Sorry, I encountered an error: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

// Helper function to determine if bot should respond
async function determineIfShouldRespond(message, userId, threadTs) {
  // Always respond to direct messages (DMs)
  if (message.channel_type === 'im') {
    return true;
  }
  
  // Respond in threads where bot is already active
  if (message.thread_ts && activeThreads.has(message.thread_ts)) {
    return true;
  }
  
  // Respond in threads where bot has an existing session
  if (message.thread_ts) {
    const threadStatus = claudeClient.getSessionStatus({
      userId,
      channel: message.channel,
      threadTs: message.thread_ts
    });
    if (threadStatus.hasSession) {
      return true;
    }
  }
  
  // Don't respond to general channel messages unless explicitly mentioned
  return false;
}


app.event('app_mention', async ({ event, say }) => {
  const prompt = event.text.replace(/<@[^>]+>/, '').trim();
  const threadTs = event.thread_ts || event.ts;
  
  if (!prompt) {
    await say({
      text: 'Hi! Mention me with a prompt to use Claude Code. Example: `@claude-bot help me debug this function`\n\nAvailable commands:\n• `@claude-bot session new` - Start a new session\n• `@claude-bot session continue` - Continue the most recent conversation\n• `@claude-bot session list` - List your recent sessions\n• `@claude-bot session status` - Check current session status\n• `@claude-bot session clear` - Clear current thread session',
      thread_ts: threadTs
    });
    return;
  }

  try {
    await say({
      text: 'Processing your request...',
      thread_ts: threadTs
    });

    const response = await claudeClient.executeCommand(prompt, {
      userId: event.user,
      channel: event.channel,
      threadTs: threadTs
    });

    let responseText = response.text || response;
    
    // Add agent identification and session info
    let footer = `\n\n_[${botName}]_`;
    if (response.sessionId) {
      footer += ` | _Session: ${response.sessionId.substring(0, 8)}..._`;
      if (response.cost) {
        footer += ` | _Cost: $${response.cost.toFixed(4)}_`;
      }
    }
    responseText += footer;

    await say({
      text: responseText,
      thread_ts: threadTs
    });
    
    // Track this thread as active
    activeThreads.add(threadTs);
  } catch (error) {
    console.error('Error processing app mention:', error);
    await say({
      text: `Sorry, I encountered an error: ${error.message}`,
      thread_ts: threadTs
    });
  }
});


// Session management commands
app.message(/^(?:claude\s+)?session\s+(new|start)/, async ({ message, say }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  
  try {
    const response = await claudeClient.startNewSession({
      userId,
      channel: message.channel,
      threadTs: threadTs
    });

    await say({
      text: `🆕 Started a new Claude session!\n\n${response.text}\n\n_[${botName}] | Session: ${response.sessionId.substring(0, 8)}..._`,
      thread_ts: threadTs
    });
    
    // Track this thread as active
    activeThreads.add(threadTs);
  } catch (error) {
    console.error('Error starting new session:', error);
    await say({
      text: `Sorry, I couldn't start a new session: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

app.message(/^(?:claude\s+)?session\s+continue/, async ({ message, say }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  
  try {
    const status = claudeClient.getSessionStatus({
      userId,
      channel: message.channel,
      threadTs: threadTs
    });

    if (!status.hasSession) {
      await say({
        text: `No previous session found. Use \`session new\` to start a fresh session.`,
        thread_ts: threadTs
      });
      return;
    }

    await say({
      text: `🔄 Continuing your previous session (${status.sessionId.substring(0, 8)}...).\n\nWhat would you like me to help you with?\n\n_[${botName}]_`,
      thread_ts: threadTs
    });
    
    // Track this thread as active
    activeThreads.add(threadTs);
  } catch (error) {
    console.error('Error continuing session:', error);
    await say({
      text: `Sorry, I couldn't continue the session: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

app.message(/^(?:claude\s+)?session\s+list/, async ({ message, say }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  
  try {
    const sessions = await claudeClient.listUserSessions(userId, message.channel);
    
    if (sessions.length === 0) {
      await say({
        text: `📋 No previous sessions found for this channel.`,
        thread_ts: threadTs
      });
      return;
    }

    const sessionList = sessions.slice(0, 10).map((session, index) => {
      const date = new Date(session.createdAt).toLocaleString();
      const sessionId = session.sessionId.substring(0, 8);
      const threadInfo = session.threadTs ? ` (Thread)` : '';
      return `${index + 1}. \`${sessionId}\` - ${date}${threadInfo}`;
    }).join('\n');

    await say({
      text: `📋 Your recent Claude sessions:\n\n${sessionList}\n\n_Use \`session resume <sessionId>\` to continue a specific session_`,
      thread_ts: threadTs
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    await say({
      text: `Sorry, I couldn't list your sessions: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

app.message(/^(?:claude\s+)?session\s+resume\s+([a-f0-9-]+)/, async ({ message, say, context }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  const sessionId = context.matches[1];
  
  try {
    // Update the session mapping to use this resumed session
    await claudeClient.setActiveSession(sessionId, {
      userId,
      channel: message.channel,
      threadTs: threadTs
    });

    await say({
      text: `🔄 Resuming session ${sessionId.substring(0, 8)}...\n\nWhat would you like me to help you with?`,
      thread_ts: threadTs
    });
    
    // Track this thread as active
    activeThreads.add(threadTs);
  } catch (error) {
    console.error('Error resuming session:', error);
    await say({
      text: `Sorry, I couldn't resume session ${sessionId}: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

app.message(/^(?:claude\s+)?session\s+status/, async ({ message, say }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  
  try {
    const status = claudeClient.getSessionStatus({
      userId,
      channel: message.channel,
      threadTs: threadTs
    });

    if (!status.hasSession) {
      await say({
        text: `📊 No active session found.\n\nUse \`session new\` to start a fresh session or \`session list\` to see previous sessions.`,
        thread_ts: threadTs
      });
      return;
    }

    const sessionType = status.threadBased ? 'Thread-based' : 'Channel-based';
    const date = new Date(status.createdAt).toLocaleString();

    await say({
      text: `📊 Current session status:\n\n• **Session ID:** \`${status.sessionId.substring(0, 8)}...\`\n• **Type:** ${sessionType}\n• **Created:** ${date}\n• **Mode:** ${status.type}`,
      thread_ts: threadTs
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    await say({
      text: `Sorry, I couldn't get the session status: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

app.message(/^(?:claude\s+)?session\s+clear/, async ({ message, say }) => {
  const userId = message.user;
  const threadTs = message.thread_ts || message.ts;
  
  try {
    let cleared = false;
    
    if (threadTs) {
      cleared = await claudeClient.clearThreadSession(threadTs);
    }
    
    if (!cleared) {
      cleared = await claudeClient.clearUserSession(userId, message.channel);
    }

    if (cleared) {
      await say({
        text: `🧹 Session cleared. Your next message will start a new conversation context.`,
        thread_ts: threadTs
      });
    } else {
      await say({
        text: `📭 No active session found to clear.`,
        thread_ts: threadTs
      });
    }
  } catch (error) {
    console.error('Error clearing session:', error);
    await say({
      text: `Sorry, I couldn't clear the session: ${error.message}`,
      thread_ts: threadTs
    });
  }
});

(async () => {
  try {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Claude Slack Bot "${botName}" is running on port ${port}!`);
    console.log(`📁 Working directory: ${workingDir}`);
    console.log(`🔧 Claude Code SDK integration enabled`);
    console.log(`🚀 MCP Server support: claude-fleet (if available)`);
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
})();