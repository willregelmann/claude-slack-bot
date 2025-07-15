# Demo Workflow Test

This demonstrates the complete user workflow for the multi-agent system.

## Test Environment Setup

```bash
# Create test projects
mkdir -p ~/test-projects/{frontend,backend,docs}

# Create different project files
echo "console.log('React app');" > ~/test-projects/frontend/app.js
echo "console.log('Express API');" > ~/test-projects/backend/server.js
echo "# Documentation" > ~/test-projects/docs/README.md

# Create environment configs (you'll need real Slack tokens)
cp .env.example ~/test-projects/frontend/.env
cp .env.example ~/test-projects/backend/.env
cp .env.example ~/test-projects/docs/.env
```

## Workflow Test

### 1. Start Multiple Agents

```bash
# Start frontend agent
claude-slack start --alias="frontend" --dir="~/test-projects/frontend" --port=3001

# Start backend agent  
claude-slack start --alias="backend" --dir="~/test-projects/backend" --port=3002

# Start docs agent
claude-slack start --alias="docs" --dir="~/test-projects/docs" --port=3003
```

### 2. Verify Agents

```bash
# List all running agents
claude-slack list

# Should show:
# 🤖 Running Claude agents:
# ● frontend
#    Directory: /home/user/test-projects/frontend
#    Port: 3001
#    PID: 12345
# ● backend  
#    Directory: /home/user/test-projects/backend
#    Port: 3002
#    PID: 12346
# ● docs
#    Directory: /home/user/test-projects/docs  
#    Port: 3003
#    PID: 12347
```

### 3. Check Status

```bash
claude-slack status frontend

# Should show detailed status including:
# - Directory binding
# - Process info
# - Memory usage
# - Uptime
```

### 4. Test Slack Integration

In Slack, each agent should respond with its alias:

**Frontend queries:**
```
@claude-bot help me optimize this React component
```
Response: `[frontend] Here are some optimization strategies for your React component...`

**Backend queries:**
```
@claude-bot review my API endpoints
```  
Response: `[backend] I'll review your API endpoints. Let me examine your server.js file...`

**Docs queries:**
```
@claude-bot help me write better documentation
```
Response: `[docs] I'll help improve your documentation. Looking at your current README.md...`

### 5. Session Isolation Test

Each agent maintains separate conversation context:
- Frontend agent remembers React discussions
- Backend agent remembers API conversations  
- Docs agent remembers documentation context

### 6. Management Operations

```bash
# View logs for specific agent
claude-slack logs frontend --lines 50

# Restart an agent
claude-slack restart backend

# Stop specific agent
claude-slack stop docs

# Stop all agents
claude-slack stop-all
```

## Expected Benefits

1. **Context Separation**: Each agent operates in its project directory
2. **Conversation Isolation**: Independent session histories
3. **Process Management**: Easy monitoring and control
4. **Team Clarity**: Clear agent identification in responses
5. **Resource Efficiency**: Only run agents for active projects

## Success Criteria

✅ All agents start successfully with unique ports  
✅ Each agent operates in correct working directory  
✅ Slack responses include proper agent identification  
✅ Session storage is isolated per agent  
✅ CLI management commands work correctly  
✅ Process monitoring shows accurate status  
✅ Logs are properly isolated per agent  

This workflow demonstrates the complete multi-agent experience from setup to daily usage.