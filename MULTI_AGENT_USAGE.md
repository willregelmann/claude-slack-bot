# Multi-Agent Usage Guide

This guide shows how to use the `claude-slack` CLI to manage multiple Claude agents for different projects and directories.

## Quick Start

```bash
# Install globally (optional)
npm install -g

# Or run directly from project
npm install
```

## Basic Usage

### Start Agents for Different Projects

```bash
# Frontend project agent
claude-slack start --alias="frontend" --dir="/path/to/my-react-app" --port=3001

# Backend project agent  
claude-slack start --alias="backend" --dir="/path/to/my-api" --port=3002

# Home directory agent
claude-slack start --alias="home" --dir="~" --port=3003

# Current directory agent with custom config
claude-slack start --alias="current" --config=".env.local"
```

### Manage Running Agents

```bash
# List all agents
claude-slack list

# Check specific agent status
claude-slack status frontend

# View agent logs
claude-slack logs frontend
claude-slack logs backend --follow  # Follow logs in real-time

# Restart an agent
claude-slack restart frontend

# Stop specific agent
claude-slack stop backend

# Stop all agents
claude-slack stop-all
```

## Slack Experience

When you have multiple agents running, each response includes the agent alias:

```
[frontend] Here's the React component you requested...

Session: a1b2c3d4... | Cost: $0.0042
```

```
[backend] The API endpoint has been updated...

Session: x9y8z7w6... | Cost: $0.0023
```

## Configuration

### Per-Agent Configuration

Each agent can have its own `.env` file:

```bash
# Use specific config file
claude-slack start --alias="prod" --config="/path/to/prod.env"
```

### Directory-Specific Sessions

Each agent maintains separate:
- Session storage (in `~/.claude-slack-bot-sessions/<alias>/`)
- Working directory for Claude Code CLI execution
- Process isolation and logging

## Use Cases

### 1. Multiple Projects
```bash
# Different codebases
claude-slack start --alias="web" --dir="~/projects/webapp"
claude-slack start --alias="mobile" --dir="~/projects/mobile-app" 
claude-slack start --alias="docs" --dir="~/projects/documentation"
```

### 2. Environment Separation
```bash
# Different environments
claude-slack start --alias="dev" --dir="~/dev" --config="dev.env"
claude-slack start --alias="staging" --dir="~/staging" --config="staging.env"
```

### 3. Team Collaboration
```bash
# Different team channels
claude-slack start --alias="team-alpha" --dir="~/alpha-project"
claude-slack start --alias="team-beta" --dir="~/beta-project"
```

## Agent Management

### Process Management
- Each agent runs as an independent process
- Automatic process monitoring and restart capabilities
- Isolated logging per agent
- Memory and uptime tracking

### Session Isolation
- Thread-based conversation continuity per agent
- Separate session storage prevents cross-contamination
- Claude Code CLI executes in agent's working directory

### Logging
```bash
# View recent logs
claude-slack logs frontend --lines 100

# Follow logs in real-time
claude-slack logs backend --follow

# Logs are stored in ~/.claude-slack-agents/logs/<alias>.log
```

## Troubleshooting

### Port Conflicts
```bash
# Check which ports are in use
claude-slack list

# Use different port
claude-slack start --alias="new-agent" --port=4000
```

### Agent Not Starting
```bash
# Check agent status and logs
claude-slack status my-agent
claude-slack logs my-agent

# Restart if needed
claude-slack restart my-agent
```

### Session Issues
- Each agent maintains separate session storage
- Sessions are isolated by agent alias
- Use `session clear` in Slack to reset conversations

## Advanced Features

### Custom Configuration
Create agent-specific `.env` files with:
- Different Slack tokens for different workspaces
- Custom tool restrictions
- Environment-specific settings

### Monitoring
```bash
# Check all agent status
claude-slack list

# Detailed status including memory usage
claude-slack status frontend
```

### Automation
```bash
# Start multiple agents from script
claude-slack start --alias="web" --dir="./web" &
claude-slack start --alias="api" --dir="./api" &
claude-slack start --alias="docs" --dir="./docs" &
```

This multi-agent architecture enables teams to run specialized Claude assistants for different projects, environments, and use cases while maintaining complete isolation and context separation.