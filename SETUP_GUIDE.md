# Complete Setup Guide

This guide walks you through setting up the Claude Slack Bot from scratch to running multiple agents.

## Step 1: Create Slack App

### 1.1 Create New Slack App
1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app name: `Claude Bot` (or your preference)
5. Select your workspace
6. Click **"Create App"**

### 1.2 Configure Basic Settings
1. Go to **"Basic Information"**
2. Copy the **Signing Secret** (you'll need this)

### 1.3 Enable Socket Mode
1. Go to **"Socket Mode"** in sidebar
2. Enable Socket Mode
3. Create an App-Level Token:
   - Token Name: `socket-mode`
   - Scope: `connections:write`
4. Copy the **App Token** (starts with `xapp-`)

### 1.4 Configure OAuth & Permissions
1. Go to **"OAuth & Permissions"**
2. Add Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `commands`

### 1.5 Create Slash Command (Optional)
1. Go to **"Slash Commands"**
2. Click **"Create New Command"**
3. Command: `/claude`
4. Request URL: (leave empty for Socket Mode)
5. Description: `Interact with Claude Code`

### 1.6 Configure Event Subscriptions
1. Go to **"Event Subscriptions"**
2. Enable Events: **On**
3. Subscribe to Bot Events:
   - `app_mention`
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### 1.7 Install App
1. Go to **"Install App"**
2. Click **"Install to Workspace"**
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## Step 2: Install Claude Slack Bot

### 2.1 Install Package
```bash
# Option 1: Install globally
npm install -g claude-slack-bot

# Option 2: Clone and install
git clone https://github.com/willregelmann/claude-slack-bot.git
cd claude-slack-bot
npm install
```

### 2.2 Setup Configuration
```bash
# Interactive setup wizard (recommended)
claude-slack config setup

# Follow the prompts:
# Slack Bot Token (xoxb-...): [paste your token]
# Slack Signing Secret: [paste your secret]  
# Slack App Token (xapp-...): [paste your app token]
```

### 2.3 Verify Configuration
```bash
claude-slack config show
```

Should show:
```
✅ Configuration is valid

🔑 Active configuration:
Bot Token: xoxb-123...
Signing Secret: a1b2c3d4...
App Token: xapp-567...
```

## Step 3: Start Your First Agent

### 3.1 Start Agent
```bash
# Start agent for current directory
claude-slack start --alias="my-project" --dir="."

# Or specify a different directory
claude-slack start --alias="frontend" --dir="/path/to/react-app"
```

### 3.2 Verify Agent is Running
```bash
claude-slack list
```

Should show:
```
🤖 Running Claude agents:

● my-project
   Directory: /current/directory
   Port: 3000
   PID: 12345
   Started: 2024-01-15T10:30:00.000Z
```

## Step 4: Test in Slack

### 4.1 Add Bot to Channel
1. Go to your Slack channel
2. Type `/invite @claude-bot` (or your bot name)
3. Invite the bot to the channel

### 4.2 Test Bot Responses
```
@claude-bot hello

# Should respond with:
# [my-project] Hello! I'm Claude, ready to help you. What would you like to work on?
# Session: a1b2c3d4... | Cost: $0.0001
```

### 4.3 Test Slash Command
```
/claude what is 2+2?

# Should respond with:
# [my-project] 4
# Session: a1b2c3d4... | Cost: $0.0001
```

## Step 5: Multi-Agent Setup

### 5.1 Start Multiple Agents
```bash
# Frontend development agent
claude-slack start --alias="frontend" --dir="~/projects/my-app/frontend" --port=3001

# Backend development agent  
claude-slack start --alias="backend" --dir="~/projects/my-app/backend" --port=3002

# Documentation agent
claude-slack start --alias="docs" --dir="~/projects/my-app/docs" --port=3003
```

### 5.2 Verify All Agents
```bash
claude-slack list
```

### 5.3 Test Agent Identification
Each agent will identify itself in responses:

**Frontend queries:**
```
@claude-bot help me with React hooks
# Response: [frontend] Here's how to use React hooks effectively...
```

**Backend queries:**
```
@claude-bot review my API design
# Response: [backend] I'll review your API design. Let me examine your code...
```

**Documentation queries:**
```
@claude-bot improve my README
# Response: [docs] I'll help improve your README.md file...
```

## Advanced Configuration

### Per-Project Configuration
Create `.env` files in project directories:

```bash
# In your project directory
cd /path/to/your/project
cat > .env << EOF
SLACK_BOT_TOKEN=xoxb-different-token
SLACK_SIGNING_SECRET=different-secret
SLACK_APP_TOKEN=xapp-different-token
EOF

# Start agent (will use local .env)
claude-slack start --alias="special-project" --dir="."
```

### Custom Configuration Files
```bash
# Use specific config file
claude-slack start --alias="prod" --config="/path/to/prod-config.env"
```

### Environment Variables
```bash
# Set environment variables
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_SIGNING_SECRET=your-secret
export SLACK_APP_TOKEN=xapp-your-token

# Start agent (will use env vars)
claude-slack start --alias="env-agent"
```

## Troubleshooting

### Configuration Issues
```bash
# Check configuration status
claude-slack config show

# Re-run setup wizard
claude-slack config setup

# View detailed help
claude-slack config help
```

### Agent Issues
```bash
# Check agent status
claude-slack status my-agent

# View agent logs
claude-slack logs my-agent

# Restart agent
claude-slack restart my-agent
```

### Slack Issues
1. **Bot not responding**: Check bot is invited to channel
2. **Permission errors**: Verify OAuth scopes are correct
3. **Socket Mode errors**: Ensure App Token has `connections:write` scope

### Common Error Messages

**"Missing required configuration"**
- Run `claude-slack config setup`
- Verify all three tokens are set

**"Port already in use"**
- Use different port: `--port=3001`
- Stop existing agent: `claude-slack stop <alias>`

**"Working directory does not exist"**
- Check directory path exists
- Use absolute paths

## Next Steps

1. **Production Deployment**: Consider running agents as system services
2. **Team Setup**: Share configuration securely with team members
3. **CI/CD Integration**: Use agents in deployment pipelines
4. **Custom Tools**: Configure Claude Code CLI with specific tool restrictions

For detailed usage patterns, see [MULTI_AGENT_USAGE.md](MULTI_AGENT_USAGE.md).