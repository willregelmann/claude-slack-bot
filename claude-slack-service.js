#!/usr/bin/env node

/**
 * Claude Slack Multi-Agent Service Manager
 * 
 * This service manages multiple Claude Slack bot agents and ensures they
 * persist across system restarts.
 */

const AgentManager = require('./src/agent-manager');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ClaudeSlackService {
  constructor() {
    this.agentManager = new AgentManager();
    this.serviceStateFile = path.join(os.homedir(), '.claude-slack-agents', 'service-state.json');
    this.isShuttingDown = false;
  }

  async start() {
    console.log('🚀 Claude Slack Multi-Agent Service starting...');
    
    // Setup signal handlers for graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGUSR1', () => this.reloadAgents());
    
    try {
      // Load and start previously running agents
      await this.loadAndStartAgents();
      
      console.log('✅ Claude Slack Multi-Agent Service started successfully');
      
      // Keep the service running
      await this.monitorAgents();
      
    } catch (error) {
      console.error('❌ Failed to start service:', error.message);
      process.exit(1);
    }
  }

  async loadAndStartAgents() {
    try {
      const stateData = await fs.readFile(this.serviceStateFile, 'utf8');
      const state = JSON.parse(stateData);
      
      console.log(`📋 Loading ${state.agents.length} agent(s) from previous session...`);
      
      for (const agentConfig of state.agents) {
        try {
          // Check if agent was manually stopped - don't auto-restart if so
          const currentConfig = await this.agentManager.getAgentConfig(agentConfig.alias);
          if (currentConfig && currentConfig.manualStop) {
            console.log(`⏭️  Skipping agent "${agentConfig.alias}" - manually stopped`);
            continue;
          }
          
          console.log(`🔄 Starting agent "${agentConfig.alias}"...`);
          const agent = await this.agentManager.startAgent(agentConfig);
          
          // Mark as service-managed for auto-restart
          agent.managedBy = 'service';
          agent.manualStop = false;
          await this.agentManager.saveAgentConfig(agent.alias, agent);
          
          console.log(`✅ Agent "${agentConfig.alias}" started successfully`);
        } catch (error) {
          console.error(`❌ Failed to start agent "${agentConfig.alias}": ${error.message}`);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📭 No previous service state found - starting fresh');
      } else {
        console.error('⚠️  Failed to load service state:', error.message);
      }
    }
  }

  async saveServiceState() {
    try {
      const agents = await this.agentManager.listAgents();
      const runningAgents = agents.filter(agent => agent.running);
      
      const state = {
        lastSaved: new Date().toISOString(),
        agents: runningAgents.map(agent => ({
          alias: agent.alias,
          dir: agent.workingDir,
          port: agent.port
        }))
      };
      
      await fs.writeFile(this.serviceStateFile, JSON.stringify(state, null, 2));
      console.log(`💾 Saved state for ${runningAgents.length} running agent(s)`);
    } catch (error) {
      console.error('⚠️  Failed to save service state:', error.message);
    }
  }

  async monitorAgents() {
    // Monitor agents every 30 seconds
    const monitorInterval = setInterval(async () => {
      if (this.isShuttingDown) {
        clearInterval(monitorInterval);
        return;
      }
      
      try {
        const agents = await this.agentManager.listAgents();
        const runningCount = agents.filter(agent => agent.running).length;
        
        // Log status periodically (every 10 minutes)
        if (Date.now() % (10 * 60 * 1000) < 30000) {
          console.log(`📊 Status: ${runningCount} agent(s) running`);
        }
        
        // Save state periodically
        await this.saveServiceState();
        
      } catch (error) {
        console.error('⚠️  Monitor error:', error.message);
      }
    }, 30000);

    // Keep the process alive
    return new Promise(() => {
      // This promise never resolves, keeping the service running
    });
  }

  async reloadAgents() {
    console.log('🔄 Reloading agents...');
    try {
      await this.saveServiceState();
      
      // Stop all current agents
      await this.agentManager.stopAllAgents();
      
      // Restart agents from saved state
      await this.loadAndStartAgents();
      
      console.log('✅ Agents reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload agents:', error.message);
    }
  }

  async shutdown(signal) {
    if (this.isShuttingDown) return;
    
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    this.isShuttingDown = true;
    
    try {
      // Save current state before stopping
      await this.saveServiceState();
      
      // Stop all agents
      const stopped = await this.agentManager.stopAllAgents();
      console.log(`✅ Stopped ${stopped} agent(s)`);
      
      console.log('👋 Claude Slack Multi-Agent Service stopped');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new ClaudeSlackService();
  service.start().catch(error => {
    console.error('💥 Service crashed:', error);
    process.exit(1);
  });
}

module.exports = ClaudeSlackService;