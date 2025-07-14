# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Production start
npm start

# Run tests
npm test

# Test Claude wrapper functionality
node test.js
```

## Environment Setup

Copy `.env.example` to `.env` and configure Slack app credentials:
- `SLACK_BOT_TOKEN` - Bot user OAuth token (xoxb-)
- `SLACK_SIGNING_SECRET` - App signing secret
- `SLACK_APP_TOKEN` - App-level token for Socket Mode (xapp-)
- `PORT` - Server port (default: 3000)

## Architecture Overview

This is a Slack bot that wraps Claude Code CLI to enable team collaboration through Slack. The architecture consists of two main components:

### Core Components

**`src/index.js`** - Main Slack Bot Application
- Uses Slack Bolt framework with Socket Mode
- Handles three interaction patterns:
  - Direct messages starting with "claude"
  - Slash command `/claude`
  - App mentions `@claude-bot`
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

### Session Management Architecture

The bot maintains conversation context through a sophisticated session system:

1. **Thread Isolation**: Each Slack thread maintains its own Claude session
2. **Automatic Continuity**: Uses `--continue` within thread contexts
3. **Session Persistence**: Stores session IDs for `--resume` across bot restarts
4. **Dual Storage**: In-memory Maps + filesystem persistence

### Key Interaction Patterns

- **Auto Mode**: Default behavior that maintains context within threads
- **Manual Session Control**: Explicit commands for session management
- **Cross-Thread Resumption**: Ability to resume any previous session in new threads

## Claude CLI Integration

The wrapper uses Claude Code CLI with these key parameters:
- `--print --output-format json` for programmatic responses
- `--continue` for same-session follow-ups
- `--resume <sessionId>` for cross-session continuity
- `TERM=dumb` environment to avoid terminal formatting issues

## Testing

Run `node test.js` to verify:
- Basic Claude wrapper functionality
- Code detection and formatting
- Session management capabilities
- Error handling

## Security Notes

- Bot inherits Claude CLI permissions from the executing user
- Session files stored in user home directory (`~/.claude-slack-bot-sessions/`)
- Consider sandboxed execution for production deployments
- Use `--allowedTools` and `--disallowedTools` Claude flags to restrict capabilities