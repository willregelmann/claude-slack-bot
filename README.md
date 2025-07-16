# Claude Slack Bot

A multi-agent Slack bot system that wraps Claude Code CLI, allowing teams to run multiple specialized Claude assistants for different projects and directories.

## Features

- **Multi-Agent Architecture**: Run multiple Claude assistants for different projects/directories
- **Simple CLI Management**: Start, stop, and manage agents with `claude-slack` command
- **Directory Isolation**: Each agent operates in its own working directory
- **Service Integration**: Systemd service for production deployment with auto-restart
- **Session Management**: Thread-based conversations with automatic continuity
- **Thread Continuity**: Auto-responds to follow-up messages in active threads
- **Multiple Interaction Methods**: Mention bots, use slash commands, or send direct messages
- **Smart Code Formatting**: Automatically detects and formats code snippets
- **Agent Coordination**: CLI and service work together without conflicts

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

There are two ways to set up your Slack app:

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

4. Create a slash command under "Slash Commands":
   - Command: `/claude`
   - Request URL: `https://your-app-url/slack/events`
   - Description: "Interact with Claude Code"

5. Subscribe to bot events under "Event Subscriptions":
   - Request URL: `https://your-app-url/slack/events`
   - Subscribe to bot events:
     - `app_mention`
     - `message.channels`
     - `message.groups`
     - `message.im`
     - `message.mpim`

6. Install the app to your workspace from "Basic Information"

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

1. **Mention the bot**: `@Claude Bot help me debug this function`
2. **Slash command**: `/claude write a Python function to sort a list`  
3. **Direct message**: `claude explain this error message`
4. **Thread continuity**: After initial contact, just type follow-up questions without prefixes

### Thread-Based Conversations

Once you start a conversation in a thread, the bot automatically responds to follow-up messages:

```
You: @Claude Bot hello!
Bot: [attic-ui] Hello! How can I help you with your project today?

You: What files are in the src directory?
Bot: [attic-ui] Here are the files in src/...

You: Can you explain the main component?
Bot: [attic-ui] The main component in src/App.js...
```

## Production Deployment

### Install as System Service

```bash
# Install the service
./install-service.sh

# Start your agents
claude-slack start --alias="frontend" --dir="/path/to/react-app" --port=3001
claude-slack start --alias="backend" --dir="/path/to/api" --port=3002

# Enable the service (agents will persist across reboots)
sudo systemctl start claude-slack
```

### Service Management

```bash
# Check service status
sudo systemctl status claude-slack

# View logs
sudo journalctl -u claude-slack -f

# Reload agents (re-reads agent configuration)
sudo systemctl reload claude-slack

# List running agents
claude-slack list
```

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

## CLI Commands

### Agent Management
```bash
# Start agents
claude-slack start --alias="my-project" --dir="/path/to/project" --port=3000

# List running agents
claude-slack list

# Stop specific agent
claude-slack stop my-project

# Stop all agents
claude-slack stop-all

# View agent status
claude-slack status my-project

# View agent logs
claude-slack logs my-project -f
```

### Configuration
```bash
# Setup Slack credentials (one-time)
claude-slack config setup

# Show current configuration
claude-slack config show

# Test system dependencies
claude-slack test

# Run diagnostics
claude-slack doctor
```

### Service Integration
```bash
# Install as system service
./install-service.sh

# Service management
sudo systemctl start claude-slack      # Start service
sudo systemctl stop claude-slack       # Stop service  
sudo systemctl status claude-slack     # Check status
sudo systemctl reload claude-slack     # Reload agents
sudo journalctl -u claude-slack -f     # View service logs
```

## Troubleshooting

1. **Bot not responding**: Check that the bot token and signing secret are correct
2. **Claude commands failing**: Verify Claude Code CLI is installed and accessible
3. **Permission errors**: Ensure the bot has necessary Slack permissions
4. **Agent conflicts**: Use `claude-slack list` to check for port conflicts
5. **Service issues**: Check `sudo journalctl -u claude-slack -f` for service logs