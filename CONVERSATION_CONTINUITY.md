# Claude Slack Bot - Conversation Continuity Features

This document describes the enhanced conversation continuity features implemented in the Claude Slack Bot using Claude Code's `--continue` and `--resume` functionality.

## Features Overview

### 1. Automatic Session Management
- **Thread-based continuity**: Conversations within Slack threads automatically maintain context
- **User-channel sessions**: Fallback to user-channel based sessions when not in threads
- **Persistent storage**: Session IDs stored in `~/.claude-slack-bot-sessions/` for resuming later

### 2. Session Types
- **Auto mode** (default): Automatically uses existing sessions when available
- **New sessions**: Explicitly start fresh conversations
- **Continue mode**: Uses Claude Code's `--continue` flag for most recent conversation
- **Resume mode**: Uses Claude Code's `--resume` flag with specific session IDs

### 3. Session Commands

#### Basic Usage
```
claude <your message>          # Uses auto session management
@claude-bot <your message>     # Uses auto session management
/claude <your message>         # Uses auto session management
```

#### Session Management Commands
```
session new                    # Start a new session
session continue              # Continue most recent conversation
session list                  # List your recent sessions
session status                # Check current session status
session clear                 # Clear current thread session
session resume <sessionId>    # Resume specific session by ID
```

## Implementation Details

### ClaudeWrapper Class Enhancements

#### New Properties
- `threadSessions`: Maps thread timestamps to session information
- `userSessions`: Maps user-channel combinations to latest sessions
- `sessionDir`: Directory for persistent session storage

#### Key Methods
- `buildClaudeArgs()`: Constructs appropriate Claude Code arguments based on session mode
- `storeSessionInfo()`: Persists session information for later retrieval
- `getExistingSession()`: Retrieves active session for context
- `setActiveSession()`: Sets a specific session as active for a thread/user
- `listUserSessions()`: Lists stored sessions for a user in a channel

### Session Storage Format
Sessions are stored as JSON files in `~/.claude-slack-bot-sessions/`:
```json
{
  "sessionId": "8b57548b-75c6-4f4a-bf4a-d604ff796647",
  "userId": "U1234567890",
  "channel": "C0987654321",
  "threadTs": "1234567890.123456",
  "createdAt": "2025-07-13T14:59:44.027Z",
  "type": "resume"
}
```

### Thread vs Channel Sessions
1. **Thread-based**: When messages are in Slack threads, each thread maintains its own session
2. **Channel-based**: Direct messages or channel messages without threads use user-channel sessions
3. **Priority**: Thread sessions take precedence over channel sessions

## Usage Examples

### Starting a Fresh Conversation
```
@claude-bot session new
# Starts a new Claude session, forgetting previous context
```

### Continuing Previous Work
```
@claude-bot session continue
# Continues the most recent conversation with full context
```

### Listing Previous Sessions
```
@claude-bot session list
# Shows:
# 📋 Your recent Claude sessions:
# 1. `8b57548b` - 7/13/2025, 10:59:44 AM (Thread)
# 2. `a93f786b` - 7/13/2025, 10:45:30 AM
```

### Resuming Specific Session
```
@claude-bot session resume 8b57548b
# Resumes the specific session by ID
```

### Checking Session Status
```
@claude-bot session status
# Shows current session information:
# 📊 Current session status:
# • Session ID: `8b57548b...`
# • Type: Thread-based  
# • Created: 7/13/2025, 10:59:44 AM
# • Mode: resume
```

## Benefits

1. **Seamless Context**: Conversations naturally continue within threads
2. **Persistent Memory**: Sessions can be resumed even after bot restarts
3. **Multi-user Support**: Each user maintains separate session contexts
4. **Flexible Control**: Users can explicitly manage session behavior
5. **Cost Tracking**: Session information includes usage and cost data

## Technical Benefits

- Uses Claude Code's native session management for reliable context preservation
- Minimal overhead with efficient in-memory session mapping
- Persistent storage enables long-term conversation resumption
- Thread-based isolation prevents context bleeding between conversations