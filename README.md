# Claude Slack Bot

A multi-agent Slack bot system that wraps Claude Code CLI, allowing teams to run multiple specialized Claude assistants for different projects and directories.

## Features

- **Multi-Agent Architecture**: Run multiple Claude assistants for different projects/directories
- **Simple CLI Management**: Start, stop, and manage agents with `claude-slack` command
- **Directory Isolation**: Each agent operates in its own working directory
- **Process Management**: Independent processes with monitoring and logging
- **Session Isolation**: Separate conversation contexts per agent
- **Multiple Interaction Methods**: Mention bots, use slash commands, or send direct messages
- **Smart Code Formatting**: Automatically detects and formats code snippets
- **Thread Responses**: Keeps conversations organized in threads

## Setup

### Prerequisites

- Node.js 16+ installed
- Claude Code CLI installed and configured
- Slack workspace with admin permissions

### Quick Installation

```bash
# Install from GitHub
git clone https://github.com/willregelmann/claude-slack-bot.git
cd claude-slack-bot
npm install

# One-time configuration setup
claude-slack config setup
# Enter your Slack app tokens when prompted

# Start your first agent
claude-slack start --alias="my-project" --dir="."
```

**For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)**

### Slack App Configuration

1. Create a new Slack app at https://api.slack.com/apps
2. Enable Socket Mode and generate an App Token
3. Add the following OAuth scopes:
   - `app_mentions:read`
   - `chat:write`
   - `commands`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`

4. Create a slash command:
   - Command: `/claude`
   - Description: "Interact with Claude Code"

5. Subscribe to bot events:
   - `app_mention`
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

6. Install the app to your workspace

### Environment Variables

```env
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_APP_TOKEN=xapp-your-slack-app-token
PORT=3000
```

## Quick Start

### Start Multiple Agents

```bash
# Install dependencies
npm install

# Start agents for different projects
claude-slack start --alias="frontend" --dir="/path/to/react-app" --port=3001
claude-slack start --alias="backend" --dir="/path/to/api" --port=3002
claude-slack start --alias="home" --dir="~" --port=3003

# List running agents
claude-slack list

# View agent status
claude-slack status frontend
```

### Slack Experience

Each agent identifies itself in responses:

```
[frontend] Here's the React component you requested...
Session: a1b2c3d4... | Cost: $0.0042

[backend] The API endpoint has been updated...
Session: x9y8z7w6... | Cost: $0.0023
```

### Interaction Methods

1. **Mention the bot**: `@claude-bot help me debug this function`
2. **Slash command**: `/claude write a Python function to sort a list`  
3. **Direct message**: `claude explain this error message`

For detailed usage instructions, see [MULTI_AGENT_USAGE.md](MULTI_AGENT_USAGE.md).

## Development

```bash
# Start in development mode with auto-reload
npm run dev

# Start in production mode
npm start

# Run tests
npm test
```

## Security Considerations

- The bot runs Claude Code CLI with the same permissions as the user running the bot
- Consider running in a sandboxed environment for production use
- Implement rate limiting for production deployments
- Review and restrict tool access as needed using Claude's `--allowedTools` and `--disallowedTools` options

## Troubleshooting

1. **Bot not responding**: Check that the bot token and signing secret are correct
2. **Claude commands failing**: Verify Claude Code CLI is installed and accessible
3. **Permission errors**: Ensure the bot has necessary Slack permissions
4. **Timeout errors**: Adjust the timeout in `claude-wrapper.js` if needed