const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-slack');
    this.configFile = path.join(this.configDir, 'config.json');
    this.initializeConfigDir();
  }

  async initializeConfigDir() {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  async getConfig(options = {}) {
    const config = {};

    // Priority order (highest to lowest):
    // 1. Explicit config file flag
    // 2. Environment variables  
    // 3. Local .env file in working directory
    // 4. Global config file

    // 4. Global config (lowest priority)
    try {
      const globalConfig = await this.loadGlobalConfig();
      Object.assign(config, globalConfig);
    } catch (error) {
      // Global config not found - that's okay
    }

    // 3. Local .env file in working directory
    if (options.workingDir) {
      try {
        const localConfig = await this.loadLocalEnv(options.workingDir);
        Object.assign(config, localConfig);
      } catch (error) {
        // Local .env not found - that's okay
      }
    }

    // 2. Environment variables
    const envConfig = this.loadFromEnv();
    Object.assign(config, envConfig);

    // 1. Explicit config file (highest priority)
    if (options.configFile) {
      try {
        const explicitConfig = await this.loadConfigFile(options.configFile);
        Object.assign(config, explicitConfig);
      } catch (error) {
        throw new Error(`Failed to load config file ${options.configFile}: ${error.message}`);
      }
    }

    // Validate required fields
    this.validateConfig(config);

    return config;
  }

  async loadGlobalConfig() {
    try {
      const content = await fs.readFile(this.configFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Global config not found. Run: claude-slack config setup');
      }
      throw error;
    }
  }

  async loadLocalEnv(workingDir) {
    const envPath = path.join(workingDir, '.env');
    const content = await fs.readFile(envPath, 'utf8');
    
    const config = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
    
    return config;
  }

  async loadConfigFile(configPath) {
    const resolvedPath = path.resolve(configPath);
    
    if (configPath.endsWith('.json')) {
      const content = await fs.readFile(resolvedPath, 'utf8');
      return JSON.parse(content);
    } else {
      // Assume .env format
      return this.loadLocalEnv(path.dirname(resolvedPath));
    }
  }

  loadFromEnv() {
    return {
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
      SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
      SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
      PORT: process.env.PORT
    };
  }

  validateConfig(config) {
    const required = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}\n\nRun: claude-slack config setup`);
    }

    // Validate token formats
    if (config.SLACK_BOT_TOKEN && !config.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
      throw new Error('SLACK_BOT_TOKEN must start with "xoxb-"');
    }

    if (config.SLACK_APP_TOKEN && !config.SLACK_APP_TOKEN.startsWith('xapp-')) {
      throw new Error('SLACK_APP_TOKEN must start with "xapp-"');
    }
  }

  async saveGlobalConfig(config) {
    await this.initializeConfigDir();
    
    const configToSave = {
      SLACK_BOT_TOKEN: config.SLACK_BOT_TOKEN,
      SLACK_SIGNING_SECRET: config.SLACK_SIGNING_SECRET,
      SLACK_APP_TOKEN: config.SLACK_APP_TOKEN,
      savedAt: new Date().toISOString()
    };

    await fs.writeFile(this.configFile, JSON.stringify(configToSave, null, 2));
  }

  async hasGlobalConfig() {
    try {
      await fs.access(this.configFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  async showConfigSources(options = {}) {
    console.log(chalk.blue('📋 Configuration sources (in priority order):\n'));

    // Check each source
    const sources = [
      {
        name: 'Explicit config file',
        path: options.configFile || 'Not specified',
        priority: 1,
        exists: options.configFile ? await this.fileExists(options.configFile) : false
      },
      {
        name: 'Environment variables',
        path: 'Current environment',
        priority: 2,
        exists: !!(process.env.SLACK_BOT_TOKEN || process.env.SLACK_SIGNING_SECRET || process.env.SLACK_APP_TOKEN)
      },
      {
        name: 'Local .env file',
        path: options.workingDir ? path.join(options.workingDir, '.env') : 'No working directory specified',
        priority: 3,
        exists: options.workingDir ? await this.fileExists(path.join(options.workingDir, '.env')) : false
      },
      {
        name: 'Global config',
        path: this.configFile,
        priority: 4,
        exists: await this.hasGlobalConfig()
      }
    ];

    sources.forEach(source => {
      const status = source.exists ? chalk.green('✓ Found') : chalk.gray('✗ Not found');
      const priority = chalk.yellow(`[${source.priority}]`);
      console.log(`${priority} ${source.name}: ${status}`);
      console.log(`    ${chalk.gray(source.path)}\n`);
    });

    try {
      const config = await this.getConfig(options);
      console.log(chalk.green('✅ Configuration is valid\n'));
      
      // Show masked tokens
      console.log(chalk.blue('🔑 Active configuration:'));
      console.log(`Bot Token: ${this.maskToken(config.SLACK_BOT_TOKEN)}`);
      console.log(`Signing Secret: ${this.maskToken(config.SLACK_SIGNING_SECRET)}`);
      console.log(`App Token: ${this.maskToken(config.SLACK_APP_TOKEN)}`);
      
    } catch (error) {
      console.log(chalk.red('❌ Configuration error:'));
      console.log(chalk.red(error.message));
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  maskToken(token) {
    if (!token) return 'Not set';
    if (token.length <= 8) return token;
    return token.substring(0, 8) + '...' + token.substring(token.length - 4);
  }

  getConfigHelp() {
    return `
${chalk.blue('🔧 Configuration Setup Help')}

${chalk.yellow('Option 1: Global Setup (Recommended)')}
  claude-slack config setup
  # Sets up configuration for all agents

${chalk.yellow('Option 2: Per-Project Setup')}  
  # Create .env file in your project directory
  cd /path/to/your/project
  cp ${path.join(__dirname, '..', '.env.example')} .env
  # Edit .env with your tokens

${chalk.yellow('Option 3: Environment Variables')}
  export SLACK_BOT_TOKEN=xoxb-your-token
  export SLACK_SIGNING_SECRET=your-secret  
  export SLACK_APP_TOKEN=xapp-your-token

${chalk.yellow('Option 4: Explicit Config File')}
  claude-slack start --config=/path/to/config.env --alias=mybot

${chalk.blue('Getting Slack Tokens:')}
1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Copy Bot User OAuth Token (xoxb-...)
4. Copy Signing Secret from Basic Information
5. Enable Socket Mode and copy App Token (xapp-...)

${chalk.blue('Validate Configuration:')}
  claude-slack config show
`;
  }
}

module.exports = ConfigManager;