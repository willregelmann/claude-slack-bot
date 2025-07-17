# Testing Guide

This project includes comprehensive tests for the Claude Slack Bot, with different test types for different scenarios.

## Test Types

### 1. Unit Tests
Fast, isolated tests with mocked dependencies:
```bash
npm run test:unit
```

**What they test:**
- `ClaudeClient` class functionality with mocked Claude CLI
- Slack bot message handling with mocked Slack Bolt
- Session management logic
- Error handling and edge cases

### 2. Integration Tests
Tests that actually call Claude CLI (when available):
```bash
npm run test:integration
```

**What they test:**
- Real Claude CLI integration
- MCP server detection (claude-fleet)
- Session persistence to filesystem
- Actual Claude conversation flows

**Requirements:**
- Claude Code CLI installed and configured locally
- Optional: claude-fleet MCP server configured

### 3. End-to-End Tests
Complete conversation flows with real Claude:
```bash
npm run test:e2e
```

**What they test:**
- Multi-turn conversations
- Session continuity across messages
- Multi-user conversation isolation
- Error recovery scenarios
- Performance under load

## Running Tests

### Quick Testing (Unit Only)
```bash
npm test
# or
npm run test:unit
```

### Full Test Suite
```bash
npm run test:all
```

### Development Testing
```bash
# Watch mode for unit tests
npm run test:watch

# Coverage report
npm run test:coverage
```

### Conditional Testing

**Without Claude Code CLI:**
- Unit tests run with mocked Claude responses
- Integration/E2E tests are automatically skipped
- Tests still verify Slack integration and session management

**With Claude Code CLI:**
- All tests run including real Claude interactions
- Uses your existing Claude Code CLI configuration
- Tests actual conversation flows and continuity

## Test Configuration

### Environment Variables

```bash
# Optional: Enable specific test types in CI
RUN_INTEGRATION_TESTS=true
RUN_E2E_TESTS=true

# Test environment overrides
NODE_ENV=test
CLAUDE_BOT_NAME=TestBot
```

### Claude Code CLI Setup

For integration tests to run with real Claude:

1. Ensure Claude Code CLI is installed and configured:
   ```bash
   # Verify Claude Code CLI is available
   claude-code --version
   ```

2. Make sure Claude Code CLI is authenticated (usually done during initial setup)

3. Optional: Configure claude-fleet MCP server for enhanced testing

## Test Structure

```
tests/
├── setup.js              # Global test configuration
├── skip-environment.js   # Skips tests when dependencies unavailable
├── claude-client.test.js # Unit tests for Claude integration
├── slack-bot.test.js     # Unit tests for Slack bot logic
├── integration.test.js   # Integration tests with real Claude
└── e2e.test.js          # End-to-end conversation flows
```

## Example Test Scenarios

### Unit Test Example
```javascript
it('should execute Claude command with basic prompt', async () => {
  // Mock Claude response
  mockProcess.stdout.on.mockImplementation((event, callback) => {
    if (event === 'data') {
      callback(JSON.stringify({ text: 'Hello!' }));
    }
  });

  const result = await claudeClient.executeCommand('Hello');
  expect(result.text).toBe('Hello!');
});
```

### Integration Test Example
```javascript
it('should maintain conversation continuity', async () => {
  // First message
  const response1 = await claudeClient.executeCommand(
    'Remember this number: 42',
    context
  );

  // Second message - should remember context
  const response2 = await claudeClient.executeCommand(
    'What number did I tell you?',
    context
  );

  expect(response2.text).toMatch(/42/);
});
```

## Continuous Integration

The GitHub Actions workflow:

1. **Unit Tests**: Run on all Node.js versions (16, 18, 20)
2. **Integration Tests**: Run only on main branch pushes
3. **Code Coverage**: Generated for unit tests
4. **Conditional Execution**: Integration tests skip if Claude CLI unavailable

## Mock Strategies

### Slack Mocking
- Mock `@slack/bolt` App class
- Capture message handlers for testing
- Simulate Slack message events and commands

### Claude Code CLI Integration
- Mock `child_process.spawn` for unit tests
- Use real Claude Code CLI for integration tests (when available)
- Graceful fallback when Claude Code CLI unavailable
- Uses existing local Claude Code CLI configuration

### File System Mocking
- Mock `fs.promises` for unit tests
- Use real filesystem for integration tests
- Temporary directories for test isolation

## Test Data Management

- **Session IDs**: Generated with timestamps for uniqueness
- **User/Channel IDs**: Use predictable test IDs
- **Temporary Files**: Cleaned up automatically
- **Test Isolation**: Each test uses separate contexts

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Test-Specific Debugging
```bash
# Run specific test file
npx jest tests/claude-client.test.js

# Run specific test case
npx jest -t "should execute Claude command"
```

### Console Output
Tests include emoji-prefixed console output:
- ✅ Success messages
- ⚠️ Warnings (e.g., Claude CLI not available)
- ℹ️ Information messages

## Contributing

When adding new features:

1. **Add unit tests** with mocked dependencies
2. **Add integration tests** for real Claude interactions
3. **Update E2E tests** for new conversation flows
4. **Ensure tests work** both with and without Claude CLI

Test philosophy: Tests should be fast, reliable, and provide confidence that the real system works correctly.