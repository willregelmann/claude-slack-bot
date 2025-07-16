# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Multi-Agent CLI Commands

```bash
# Agent management
claude-slack start --alias="project-name" --dir="/path/to/project" --port=3000
claude-slack list
claude-slack stop project-name
claude-slack status project-name
claude-slack logs project-name -f

# Configuration
claude-slack config setup
claude-slack config show

# System service
./install-service.sh
sudo systemctl start claude-slack
```

## Development Commands

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Run tests
npm test

# Test system
claude-slack test
claude-slack doctor
```

## Environment Setup

Copy `.env.example` to `.env` and configure Slack app credentials:
- `SLACK_BOT_TOKEN` - Bot user OAuth token (xoxb-)
- `SLACK_SIGNING_SECRET` - App signing secret
- `SLACK_APP_TOKEN` - App-level token for Socket Mode (xapp-)
- `PORT` - Server port (default: 3000)

## Architecture Overview

This is a multi-agent Slack bot system that wraps Claude Code CLI to enable team collaboration through Slack. The architecture supports multiple independent Claude assistants, each running in different project directories.

### Core Components

**`bin/claude-slack.js`** - Multi-Agent CLI Manager
- Command-line interface for managing multiple Claude agents
- Agent lifecycle management (start, stop, list, status, logs)
- Configuration management and system diagnostics
- Template-based agent creation

**`src/agent-manager.js`** - Agent Process Manager
- Spawns and manages individual Claude Slack bot processes
- Handles agent configuration and state persistence
- Port allocation and conflict detection
- Process monitoring and cleanup

**`src/index.js`** - Individual Slack Bot Application
- Uses Slack Bolt framework with Socket Mode
- Handles multiple interaction patterns:
  - Direct messages starting with "claude"
  - Slash command `/claude`
  - App mentions `@Claude Bot`
  - Thread continuity (auto-responds in active threads)
- Implements session management commands (new, continue, list, status, clear, resume)
- Thread-based conversation isolation using `thread_ts`

**`src/claude-wrapper.js`** - Claude Code CLI Wrapper
- Spawns Claude CLI processes with proper argument handling
- Manages conversation continuity via `--continue` and `--resume` flags
- Implements dual-level session storage:
  - Thread-based sessions (priority) for isolated conversations
  - User-channel sessions (fallback) for general continuity
- Persists session metadata to `~/.claude-slack-bot-sessions/` for bot restarts
- Auto-detects and formats code responses with syntax highlighting

**`claude-slack-service.js`** - System Service Manager
- Systemd service for production deployment
- Automatically saves and restores agent state across reboots
- Monitors agent health and provides graceful shutdown
- Coordinates with CLI to prevent conflicts

### Session Management Architecture

The bot maintains conversation context through a sophisticated session system:

1. **Thread Isolation**: Each Slack thread maintains its own Claude session
2. **Automatic Continuity**: Uses `--continue` within thread contexts
3. **Session Persistence**: Stores session IDs for `--resume` across bot restarts
4. **Dual Storage**: In-memory Maps + filesystem persistence

### Key Interaction Patterns

- **Thread Continuity**: After initial mention/command, bot auto-responds to follow-up messages in the same thread
- **Auto Mode**: Default behavior that maintains context within threads
- **Manual Session Control**: Explicit commands for session management
- **Cross-Thread Resumption**: Ability to resume any previous session in new threads
- **Multi-Agent Context**: Each agent operates in its own project directory with separate sessions

### Agent Coordination

The system coordinates between CLI and service management:

1. **Agent Ownership**: Tracks whether agent was started by CLI or service (`managedBy` field)
2. **Manual Stop Protection**: CLI-stopped agents marked with `manualStop: true` to prevent auto-restart
3. **Service Persistence**: Service automatically saves/restores running agents across reboots
4. **State Synchronization**: Both CLI and service respect each other's agent management

## Claude CLI Integration

The wrapper uses Claude Code CLI with these key parameters:
- `--print --output-format json` for programmatic responses
- `--continue` for same-session follow-ups
- `--resume <sessionId>` for cross-session continuity
- `TERM=dumb` environment to avoid terminal formatting issues

## Testing and Diagnostics

```bash
# Test system dependencies and configuration
claude-slack test --dir="/path/to/project"

# Run comprehensive diagnostics
claude-slack doctor

# Test individual agent functionality
node test.js
```

Verifies:
- Node.js version compatibility
- Claude CLI availability and functionality
- Slack configuration validity
- Network connectivity to Slack servers
- Working directory permissions
- Agent process management
- Session management capabilities
- Code detection and formatting

## Security Notes

- Bot inherits Claude CLI permissions from the executing user
- Session files stored in user home directory (`~/.claude-slack-bot-sessions/`)
- Consider sandboxed execution for production deployments
- Use `--allowedTools` and `--disallowedTools` Claude flags to restrict capabilities