# Claude Slack Bot

A Slack bot that integrates Claude Code SDK with optional claude-fleet MCP server for enhanced team collaboration through Slack.

## Features

- **Claude Code SDK Integration**: Native integration with Claude Code SDK for improved performance
- **MCP Server Support**: Auto-detects and leverages claude-fleet MCP server for task delegation
- **Session Management**: Thread-based conversations with automatic continuity
- **Thread Continuity**: Auto-responds to follow-up messages in active threads
- **Natural Interactions**: Direct messages and mentions work seamlessly
- **Smart Code Formatting**: Automatically detects and formats code snippets
- **Simple Deployment**: Single process deployment with minimal configuration

## Setup

### Prerequisites

- Node.js 16+ installed
- Claude Code CLI installed and configured
- Slack workspace with admin permissions
- Optional: claude-fleet MCP server for enhanced capabilities

### Quick Installation

```bash
# Install from GitHub
git clone https://github.com/willregelmann/claude-slack-bot.git
cd claude-slack-bot
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Slack app tokens

# Start the bot
npm start
```

### Slack App Configuration

#### Option 1: Using App Manifest (Recommended)

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From an app manifest"
3. Select your workspace
4. Copy the contents of `manifest.yml` from this repository
5. Replace `https://your-app-url.ngrok.io` with your actual app URL (use ngrok for local development)
6. Paste the manifest and click "Next"
7. Review the configuration and click "Create"
8. Once created, go to "Basic Information" and install the app to your workspace
9. Go to "OAuth & Permissions" and copy the Bot User OAuth Token (starts with `xoxb-`)
10. Go to "Basic Information" > "App-Level Tokens" and create a token with `connections:write` scope
11. Copy the App-Level Token (starts with `xapp-`)

#### Option 2: Manual Configuration

1. Create a new Slack app at https://api.slack.com/apps
2. Enable Socket Mode under "Socket Mode" and generate an App Token with `connections:write` scope
3. Add the following OAuth scopes under "OAuth & Permissions":
   - `app_mentions:read`
   - `chat:write`
   - `commands`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `channels:read`
   - `groups:read`
   - `im:read`
   - `mpim:read`
   - `users:read`

4. Subscribe to bot events under "Event Subscriptions":
   - Request URL: `https://your-app-url/slack/events`
   - Subscribe to bot events:
     - `app_mention`
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`

5. Install the app to your workspace from "Basic Information"

### Environment Variables

```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_APP_TOKEN=xapp-your-slack-app-token
CLAUDE_BOT_NAME=Claude
CLAUDE_WORKING_DIR=/path/to/your/project
PORT=3000
```

## Quick Start

### Start the Bot

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Development mode with auto-reload
npm run dev
```

### Slack Experience

The bot identifies itself in responses:

```
[Claude] Here's the solution you requested...
Session: a1b2c3d4... | Cost: $0.0042
```

### Interaction Methods

1. **Mention the bot**: `@Claude Bot help me debug this function`
2. **Direct message**: Just message the bot directly (no prefix needed)
3. **Thread continuity**: After initial contact, just type follow-up messages naturally

### Natural Conversations

**Direct Messages**: Just message the bot directly - no prefixes needed:
```
You: hello!
Bot: [Claude] Hello! How can I help you with your project today?

You: what files are in the src directory?
Bot: [Claude] Here are the files in src/...
```

**Thread Conversations**: Once you mention the bot in a channel, follow-up messages are natural:
```
You: @Claude Bot hello!
Bot: [Claude] Hello! How can I help you with your project today?

You: what files are in the src directory?
Bot: [Claude] Here are the files in src/...

You: can you explain the main component?
Bot: [Claude] The main component in src/App.js...
```

### Session Management Commands

- `session new` - Start a fresh conversation
- `session continue` - Continue your previous session
- `session list` - List your recent sessions
- `session status` - Check current session status
- `session clear` - Clear current session
- `session resume <sessionId>` - Resume a specific session

## MCP Integration

When claude-fleet MCP server is available, the bot automatically leverages it for:

- Task delegation and coordination
- Enhanced project management capabilities
- Advanced workflow automation
- Multi-agent task distribution

The bot will automatically detect and use claude-fleet if it's configured in your Claude Code setup.

## Development

```bash
# Start in development mode with auto-reload
npm run dev

# Run tests
npm test
```

## Security Considerations

- The bot runs Claude Code CLI with the same permissions as the user running the bot
- Consider running in a sandboxed environment for production use
- Implement rate limiting for production deployments
- Review and restrict tool access as needed using Claude's `--allowedTools` and `--disallowedTools` options
- MCP server integration provides additional security boundaries

## Troubleshooting

1. **Bot not responding**: Check that the bot token and signing secret are correct
2. **Claude commands failing**: Verify Claude Code CLI is installed and accessible
3. **Permission errors**: Ensure the bot has necessary Slack permissions
4. **MCP server issues**: Check claude-fleet configuration and connectivity