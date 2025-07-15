const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const ConfigManager = require('./config-manager');

class AgentManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-slack-agents');
    this.configManager = new ConfigManager();
    this.initializeConfigDir();
  }

  async initializeConfigDir() {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.mkdir(path.join(this.configDir, 'logs'), { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  async startAgent(options) {
    const { alias, dir, port = 3000, config } = options;
    
    // Validate alias
    if (!alias || alias.length === 0) {
      throw new Error('Agent alias is required');
    }

    // Check if alias already exists
    const existing = await this.getAgentConfig(alias);
    if (existing && existing.running) {
      throw new Error(`Agent "${alias}" is already running`);
    }

    // Resolve working directory
    const workingDir = path.resolve(dir || process.cwd());
    
    // Validate working directory exists
    try {
      await fs.access(workingDir);
    } catch (error) {
      throw new Error(`Working directory does not exist: ${workingDir}`);
    }

    // Check if port is available (basic check)
    const agents = await this.listAgents();
    const portInUse = agents.some(agent => agent.port == port && agent.running);
    if (portInUse) {
      throw new Error(`Port ${port} is already in use by another agent`);
    }

    // Load configuration using the new config manager
    let slackConfig;
    try {
      slackConfig = await this.configManager.getConfig({
        workingDir: workingDir,
        configFile: config
      });
    } catch (error) {
      throw new Error(`Configuration error: ${error.message}`);
    }

    // Prepare environment
    const env = { 
      ...process.env,
      ...slackConfig
    };

    // Set agent-specific environment variables
    env.CLAUDE_AGENT_ALIAS = alias;
    env.CLAUDE_AGENT_WORKING_DIR = workingDir;
    env.PORT = port.toString();

    // Prepare log file
    const logFile = path.join(this.configDir, 'logs', `${alias}.log`);
    const logStream = await fs.open(logFile, 'a');

    // Spawn the bot process
    const botProcess = spawn('node', [path.join(__dirname, 'index.js')], {
      cwd: workingDir,
      env,
      stdio: ['ignore', logStream.fd, logStream.fd],
      detached: true
    });

    // Let the process run independently
    botProcess.unref();

    // Store agent configuration
    const agentConfig = {
      alias,
      workingDir,
      port: parseInt(port),
      pid: botProcess.pid,
      startedAt: new Date().toISOString(),
      logFile,
      running: true,
      configFile: config
    };

    await this.saveAgentConfig(alias, agentConfig);

    // Close log file descriptor in parent process
    await logStream.close();

    return agentConfig;
  }

  async stopAgent(alias) {
    const config = await this.getAgentConfig(alias);
    if (!config) {
      return false;
    }

    if (config.pid) {
      try {
        process.kill(config.pid, 'SIGTERM');
        
        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Force kill if still running
        try {
          process.kill(config.pid, 'SIGKILL');
        } catch (error) {
          // Process already dead, ignore
        }
      } catch (error) {
        // Process might already be dead
      }
    }

    // Update config
    config.running = false;
    config.stoppedAt = new Date().toISOString();
    await this.saveAgentConfig(alias, config);

    return true;
  }

  async restartAgent(alias) {
    const config = await this.getAgentConfig(alias);
    if (!config) {
      throw new Error(`Agent "${alias}" not found`);
    }

    // Stop if running
    await this.stopAgent(alias);

    // Start with same configuration
    return await this.startAgent({
      alias,
      dir: config.workingDir,
      port: config.port,
      config: config.configFile
    });
  }

  async listAgents() {
    try {
      const files = await fs.readdir(this.configDir);
      const agents = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const alias = file.replace('.json', '');
            const config = await this.getAgentConfig(alias);
            if (config) {
              // Check if process is actually running
              config.running = await this.isProcessRunning(config.pid);
              agents.push(config);
            }
          } catch (error) {
            console.error(`Failed to read agent config ${file}:`, error);
          }
        }
      }

      return agents.sort((a, b) => a.alias.localeCompare(b.alias));
    } catch (error) {
      return [];
    }
  }

  async getAgentStatus(alias) {
    const config = await this.getAgentConfig(alias);
    if (!config) {
      throw new Error(`Agent "${alias}" not found`);
    }

    const running = await this.isProcessRunning(config.pid);
    const uptime = running ? this.calculateUptime(config.startedAt) : '0s';
    const memory = running ? await this.getProcessMemory(config.pid) : 'N/A';

    return {
      ...config,
      running,
      uptime,
      memory
    };
  }

  async stopAllAgents() {
    const agents = await this.listAgents();
    const runningAgents = agents.filter(agent => agent.running);
    
    let stopped = 0;
    for (const agent of runningAgents) {
      try {
        await this.stopAgent(agent.alias);
        stopped++;
      } catch (error) {
        console.error(`Failed to stop agent ${agent.alias}:`, error);
      }
    }

    return stopped;
  }

  async showLogs(alias, options = {}) {
    const config = await this.getAgentConfig(alias);
    if (!config) {
      throw new Error(`Agent "${alias}" not found`);
    }

    const { follow = false, lines = 50 } = options;

    if (follow) {
      // Use tail -f equivalent
      const tailProcess = spawn('tail', ['-f', config.logFile], {
        stdio: 'inherit'
      });

      process.on('SIGINT', () => {
        tailProcess.kill();
        process.exit(0);
      });
    } else {
      // Show last N lines
      try {
        const content = await fs.readFile(config.logFile, 'utf8');
        const logLines = content.split('\n');
        const lastLines = logLines.slice(-lines).join('\n');
        console.log(lastLines);
      } catch (error) {
        console.log('No logs available yet');
      }
    }
  }

  async getAgentConfig(alias) {
    try {
      const configPath = path.join(this.configDir, `${alias}.json`);
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async saveAgentConfig(alias, config) {
    const configPath = path.join(this.configDir, `${alias}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  async isProcessRunning(pid) {
    if (!pid) return false;
    
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  calculateUptime(startedAt) {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now - start;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  async getProcessMemory(pid) {
    if (!pid) return 'N/A';
    
    try {
      const statm = await fs.readFile(`/proc/${pid}/statm`, 'utf8');
      const pages = parseInt(statm.split(' ')[1]); // RSS pages
      const memoryMB = Math.round((pages * 4096) / (1024 * 1024)); // Convert to MB
      return `${memoryMB}MB`;
    } catch (error) {
      return 'N/A';
    }
  }
}

module.exports = AgentManager;