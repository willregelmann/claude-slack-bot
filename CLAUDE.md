# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Install dependencies
npm install

# Start the bot
npm start

# Development with auto-reload
npm run dev
```

## Testing

```bash
# Run tests
npm test
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `SLACK_BOT_TOKEN` - Bot user OAuth token (xoxb-)
- `SLACK_SIGNING_SECRET` - App signing secret
- `SLACK_APP_TOKEN` - App-level token for Socket Mode (xapp-)
- `CLAUDE_BOT_NAME` - Bot display name (default: Claude)
- `CLAUDE_WORKING_DIR` - Working directory for Claude Code (default: current)
- `PORT` - Server port (default: 3000)

## Architecture Overview

This is a simplified Slack bot that integrates Claude Code SDK with optional claude-fleet MCP server for team collaboration through Slack.

### Core Components

**`src/index.js`** - Main Slack Bot Application
- Uses Slack Bolt framework with Socket Mode
- Handles multiple interaction patterns:
  - All direct messages (no prefix required)
  - App mentions `@Claude Bot`
  - Thread continuity (auto-responds in active threads)
- Implements session management commands (new, continue, list, status, clear, resume)
- Thread-based conversation isolation using `thread_ts`

**`src/claude-client.js`** - Claude Code SDK Client
- Uses Claude Code CLI with proper argument handling
- Manages conversation continuity via `--continue` and `--resume` flags
- Implements dual-level session storage:
  - Thread-based sessions (priority) for isolated conversations
  - User-channel sessions (fallback) for general continuity
- Persists session metadata to `~/.claude-slack-bot-sessions/` for bot restarts
- Auto-detects claude-fleet MCP server availability
- Integrates with Claude Code SDK architecture

### Session Management Architecture

The bot maintains conversation context through a sophisticated session system:

1. **Thread Isolation**: Each Slack thread maintains its own Claude session
2. **Automatic Continuity**: Uses `--continue` within thread contexts
3. **Session Persistence**: Stores session IDs for `--resume` across bot restarts
4. **Dual Storage**: In-memory Maps + filesystem persistence
5. **MCP Integration**: Leverages claude-fleet MCP server when available for enhanced capabilities

### Key Interaction Patterns

- **Natural Direct Messages**: Bot responds to all DMs without requiring prefixes
- **Thread Continuity**: After initial mention, bot auto-responds to follow-up messages in the same thread
- **Smart Channel Behavior**: Only responds when mentioned or in active threads to avoid noise
- **Manual Session Control**: Explicit commands for session management
- **Cross-Thread Resumption**: Ability to resume any previous session in new threads
- **MCP Enhanced**: When claude-fleet is available, supports task delegation and advanced workflows

## Claude Code SDK Integration

The client uses Claude Code CLI with these key parameters:
- `--print --output-format json` for programmatic responses
- `--continue` for same-session follow-ups
- `--resume <sessionId>` for cross-session continuity
- `--mcp-server claude-fleet` for enhanced capabilities (when available)
- `TERM=dumb` environment to avoid terminal formatting issues

## Testing and Verification

```bash
# Run tests
npm test

# Manual testing
node src/index.js
```

Verifies:
- Node.js version compatibility
- Claude Code CLI availability and functionality
- Slack configuration validity
- Network connectivity to Slack servers
- Working directory permissions
- Session management capabilities
- MCP server integration (claude-fleet)
- Code detection and formatting

## Security Notes

- Bot inherits Claude Code CLI permissions from the executing user
- Session files stored in user home directory (`~/.claude-slack-bot-sessions/`)
- Consider sandboxed execution for production deployments
- Use `--allowedTools` and `--disallowedTools` Claude flags to restrict capabilities
- MCP server integration provides additional security boundaries
- Review claude-fleet configuration for proper access controls

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.