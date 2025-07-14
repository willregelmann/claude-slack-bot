# Claude Slack Bot

A Slack bot that wraps Claude Code CLI, allowing teams to interact with Claude directly through Slack channels.

## Features

- **Multiple interaction methods**: Mention the bot, use slash commands, or send direct messages
- **Smart code formatting**: Automatically detects and formats code snippets
- **Thread responses**: Keeps conversations organized in threads
- **Error handling**: Graceful error messages and timeouts
- **Per-user context**: Maintains separate contexts for different users and channels

## Setup

### Prerequisites

- Node.js 16+ installed
- Claude Code CLI installed and configured
- Slack workspace with admin permissions

### Installation

1. Clone or create the project:
```bash
mkdir claude-slack-bot
cd claude-slack-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Slack app credentials
```

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

## Usage

### Methods to interact with Claude:

1. **Mention the bot**:
   ```
   @claude-bot help me debug this function
   ```

2. **Use the slash command**:
   ```
   /claude write a Python function to sort a list
   ```

3. **Direct message starting with "claude"**:
   ```
   claude explain this error message
   ```

### Response Format

- Code snippets are automatically formatted with syntax highlighting
- Long responses are truncated with a note
- Responses appear in threads to keep channels organized
- Error messages are user-friendly

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