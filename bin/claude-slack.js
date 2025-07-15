#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const AgentManager = require('../src/agent-manager');
const ConfigManager = require('../src/config-manager');
const AgentTemplates = require('../src/agent-templates');

const program = new Command();
const agentManager = new AgentManager();
const configManager = new ConfigManager();
const agentTemplates = new AgentTemplates();

program
  .name('claude-slack')
  .description('Manage multiple Claude Slack bot agents')
  .version('1.0.0');

// Configuration commands
const configCommand = program
  .command('config')
  .description('Manage configuration settings');

configCommand
  .command('setup')
  .description('Interactive setup wizard for Slack configuration')
  .action(async () => {
    try {
      await setupWizard();
    } catch (error) {
      console.error(chalk.red(`❌ Setup failed: ${error.message}`));
      process.exit(1);
    }
  });

configCommand
  .command('show')
  .description('Show current configuration sources and status')
  .option('--dir <path>', 'Working directory to check for local .env')
  .option('--config <path>', 'Explicit config file to check')
  .action(async (options) => {
    try {
      await configManager.showConfigSources({
        workingDir: options.dir,
        configFile: options.config
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to show config: ${error.message}`));
      process.exit(1);
    }
  });

configCommand
  .command('help')
  .description('Show detailed configuration help')
  .action(() => {
    console.log(configManager.getConfigHelp());
  });

program
  .command('test')
  .description('Test system dependencies and configuration')
  .option('--dir <path>', 'Working directory to test', process.cwd())
  .action(async (options) => {
    try {
      await runSystemTest(options);
    } catch (error) {
      console.error(chalk.red(`❌ Test failed: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Run comprehensive system diagnostics')
  .action(async () => {
    try {
      await runDiagnostics();
    } catch (error) {
      console.error(chalk.red(`❌ Diagnostics failed: ${error.message}`));
      process.exit(1);
    }
  });

// Template commands
const templateCommand = program
  .command('template')
  .description('Manage agent templates');

templateCommand
  .command('list')
  .description('List available agent templates')
  .action(async () => {
    try {
      const templates = await agentTemplates.listTemplates();
      
      if (templates.length === 0) {
        console.log(chalk.yellow('📭 No templates available'));
        return;
      }

      console.log(chalk.blue('📋 Available agent templates:\n'));
      
      templates.forEach(template => {
        console.log(`${chalk.bold(template.id)} - ${template.name}`);
        console.log(`  ${chalk.gray(template.description)}`);
        console.log(`  ${chalk.gray(`Default: ${template.defaultDir} (port ${template.defaultPort})`)}\n`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to list templates: ${error.message}`));
      process.exit(1);
    }
  });

templateCommand
  .command('show')
  .description('Show template details')
  .argument('<id>', 'Template ID to show')
  .action(async (id) => {
    try {
      const template = await agentTemplates.getTemplate(id);
      
      console.log(chalk.blue(`📋 Template: ${template.name}\n`));
      console.log(`Description: ${template.description}`);
      console.log(`Default Directory: ${template.defaultDir}`);
      console.log(`Default Port: ${template.defaultPort}`);
      console.log(`Suggested Alias: ${template.suggestedAlias}`);
      
      if (template.restrictions) {
        console.log(`\nTool Restrictions:`);
        if (template.restrictions.allowedTools) {
          console.log(`  Allowed: ${template.restrictions.allowedTools.join(', ')}`);
        }
        if (template.restrictions.disallowedTools) {
          console.log(`  Disallowed: ${template.restrictions.disallowedTools.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to show template: ${error.message}`));
      process.exit(1);
    }
  });

templateCommand
  .command('create')
  .description('Create agent from template')
  .argument('<id>', 'Template ID to use')
  .option('--alias <name>', 'Custom alias for the agent')
  .option('--dir <path>', 'Custom directory path')
  .option('--port <number>', 'Custom port number')
  .action(async (id, options) => {
    try {
      console.log(chalk.blue(`🚀 Creating agent from template "${id}"...`));
      
      const agentConfig = await agentTemplates.applyTemplate(id, options);
      
      const agent = await agentManager.startAgent(agentConfig);
      
      console.log(chalk.green(`✅ Agent "${agent.alias}" created successfully!`));
      console.log(chalk.gray(`   Template: ${id}`));
      console.log(chalk.gray(`   Directory: ${agent.workingDir}`));
      console.log(chalk.gray(`   Port: ${agent.port}`));
      console.log(chalk.gray(`   PID: ${agent.pid}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create agent from template: ${error.message}`));
      process.exit(1);
    }
  });

templateCommand
  .command('help')
  .description('Show template help')
  .action(() => {
    console.log(agentTemplates.getTemplateHelp());
  });

async function setupWizard() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function question(prompt) {
    return new Promise(resolve => {
      rl.question(prompt, resolve);
    });
  }

  try {
    console.log(chalk.blue('🚀 Claude Slack Bot Configuration Setup\n'));
    
    console.log(chalk.yellow('You need three tokens from your Slack app:'));
    console.log('1. Bot User OAuth Token (starts with xoxb-)');
    console.log('2. Signing Secret (from Basic Information)');
    console.log('3. App-Level Token (starts with xapp-, requires Socket Mode)\n');
    
    console.log(chalk.gray('Get these from: https://api.slack.com/apps\n'));

    const config = {};
    
    config.SLACK_BOT_TOKEN = await question('Slack Bot Token (xoxb-...): ');
    if (!config.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
      throw new Error('Bot token must start with "xoxb-"');
    }

    config.SLACK_SIGNING_SECRET = await question('Slack Signing Secret: ');
    if (!config.SLACK_SIGNING_SECRET || config.SLACK_SIGNING_SECRET.length < 10) {
      throw new Error('Signing secret appears to be invalid');
    }

    config.SLACK_APP_TOKEN = await question('Slack App Token (xapp-...): ');
    if (!config.SLACK_APP_TOKEN.startsWith('xapp-')) {
      throw new Error('App token must start with "xapp-"');
    }

    console.log(chalk.blue('\n🔄 Saving configuration...'));
    await configManager.saveGlobalConfig(config);
    
    console.log(chalk.green('✅ Configuration saved successfully!'));
    console.log(chalk.gray('Saved to: ~/.claude-slack/config.json\n'));
    
    console.log(chalk.blue('🎉 You can now start agents with:'));
    console.log(chalk.white('  claude-slack start --alias="my-agent" --dir="/path/to/project"'));
    
  } finally {
    rl.close();
  }
}

async function runSystemTest(options) {
  console.log(chalk.blue('🧪 Running system tests...\n'));
  
  const tests = [
    { name: 'Node.js version', test: testNodeVersion },
    { name: 'Claude CLI availability', test: testClaudeCLI },
    { name: 'Configuration validity', test: () => testConfiguration(options) },
    { name: 'Network connectivity', test: testNetworkConnectivity },
    { name: 'Working directory access', test: () => testWorkingDirectory(options.dir) }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.test();
      console.log(chalk.green(`✅ ${test.name}: ${result || 'OK'}`));
      passed++;
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: ${error.message}`));
      failed++;
    }
  }

  console.log(chalk.blue(`\n📊 Test Results: ${chalk.green(passed)} passed, ${chalk.red(failed)} failed`));
  
  if (failed === 0) {
    console.log(chalk.green('\n🎉 All tests passed! Your system is ready to run Claude agents.'));
  } else {
    console.log(chalk.red('\n💥 Some tests failed. Please resolve the issues above.'));
    process.exit(1);
  }
}

async function runDiagnostics() {
  console.log(chalk.blue('🔍 Running comprehensive diagnostics...\n'));
  
  // System information
  console.log(chalk.yellow('📋 System Information:'));
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used\n`);

  // Configuration status
  console.log(chalk.yellow('⚙️ Configuration Status:'));
  try {
    await configManager.showConfigSources();
  } catch (error) {
    console.log(chalk.red(`Configuration error: ${error.message}`));
  }

  // Running agents
  console.log(chalk.yellow('🤖 Running Agents:'));
  try {
    const agents = await agentManager.listAgents();
    if (agents.length === 0) {
      console.log(chalk.gray('No agents currently running'));
    } else {
      agents.forEach(agent => {
        const status = agent.running ? chalk.green('●') : chalk.red('●');
        console.log(`${status} ${agent.alias} (PID: ${agent.pid || 'N/A'})`);
      });
    }
  } catch (error) {
    console.log(chalk.red(`Agent listing error: ${error.message}`));
  }

  // Dependency checks
  console.log(chalk.yellow('\n🔧 Dependency Checks:'));
  await runSystemTest({ dir: process.cwd() });
}

async function testNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major < 16) {
    throw new Error(`Node.js ${version} is too old. Requires Node.js 16+`);
  }
  
  return `${version} (OK)`;
}

async function testClaudeCLI() {
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--version'], { stdio: 'pipe' });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve('Available');
      } else {
        reject(new Error('Claude CLI not found or not working. Please install Claude Code CLI.'));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Claude CLI not found: ${error.message}`));
    });
  });
}

async function testConfiguration(options) {
  try {
    const config = await configManager.getConfig({
      workingDir: options.dir
    });
    
    // Test token formats
    if (!config.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
      throw new Error('Invalid bot token format');
    }
    
    if (!config.SLACK_APP_TOKEN.startsWith('xapp-')) {
      throw new Error('Invalid app token format');
    }
    
    return 'Valid configuration found';
  } catch (error) {
    throw new Error(`Configuration invalid: ${error.message}`);
  }
}

async function testNetworkConnectivity() {
  const https = require('https');
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'slack.com',
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    }, (res) => {
      resolve('Can reach Slack servers');
    });
    
    req.on('error', (error) => {
      reject(new Error(`Network connectivity issue: ${error.message}`));
    });
    
    req.on('timeout', () => {
      reject(new Error('Network timeout - check internet connection'));
    });
    
    req.end();
  });
}

async function testWorkingDirectory(dir) {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const resolved = path.resolve(dir);
    await fs.access(resolved, fs.constants.R_OK | fs.constants.W_OK);
    return `${resolved} is accessible`;
  } catch (error) {
    throw new Error(`Working directory ${dir} is not accessible: ${error.message}`);
  }
}

program
  .command('start')
  .description('Start a new Claude Slack bot agent')
  .requiredOption('--alias <name>', 'Unique alias for this agent')
  .option('--dir <path>', 'Working directory for Claude Code CLI', process.cwd())
  .option('--port <number>', 'Port for this agent instance', '3000')
  .option('--config <path>', 'Path to .env config file')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`🚀 Starting Claude agent "${options.alias}"...`));
      
      const agent = await agentManager.startAgent(options);
      
      console.log(chalk.green(`✅ Agent "${agent.alias}" started successfully!`));
      console.log(chalk.gray(`   Directory: ${agent.workingDir}`));
      console.log(chalk.gray(`   Port: ${agent.port}`));
      console.log(chalk.gray(`   PID: ${agent.pid}`));
      console.log(chalk.gray(`   Logs: ${agent.logFile}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start agent: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop a running agent')
  .argument('<alias>', 'Agent alias to stop')
  .action(async (alias) => {
    try {
      const stopped = await agentManager.stopAgent(alias);
      
      if (stopped) {
        console.log(chalk.green(`✅ Agent "${alias}" stopped successfully`));
      } else {
        console.log(chalk.yellow(`⚠️  Agent "${alias}" was not running`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop agent: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('restart')
  .description('Restart a running agent')
  .argument('<alias>', 'Agent alias to restart')
  .action(async (alias) => {
    try {
      console.log(chalk.blue(`🔄 Restarting agent "${alias}"...`));
      
      await agentManager.stopAgent(alias);
      const agent = await agentManager.restartAgent(alias);
      
      console.log(chalk.green(`✅ Agent "${alias}" restarted successfully!`));
      console.log(chalk.gray(`   PID: ${agent.pid}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to restart agent: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all running agents')
  .action(async () => {
    try {
      const agents = await agentManager.listAgents();
      
      if (agents.length === 0) {
        console.log(chalk.yellow('📭 No agents currently running'));
        return;
      }

      console.log(chalk.blue('🤖 Running Claude agents:'));
      console.log();
      
      agents.forEach(agent => {
        const status = agent.running ? chalk.green('●') : chalk.red('●');
        console.log(`${status} ${chalk.bold(agent.alias)}`);
        console.log(`   Directory: ${chalk.gray(agent.workingDir)}`);
        console.log(`   Port: ${chalk.gray(agent.port)}`);
        console.log(`   PID: ${chalk.gray(agent.pid || 'N/A')}`);
        console.log(`   Started: ${chalk.gray(agent.startedAt)}`);
        console.log();
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to list agents: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('Show logs for an agent')
  .argument('<alias>', 'Agent alias to show logs for')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <number>', 'Number of lines to show', '50')
  .action(async (alias, options) => {
    try {
      await agentManager.showLogs(alias, options);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to show logs: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show detailed status for an agent')
  .argument('<alias>', 'Agent alias to check')
  .action(async (alias) => {
    try {
      const status = await agentManager.getAgentStatus(alias);
      
      console.log(chalk.blue(`📊 Status for agent "${alias}":`));
      console.log();
      console.log(`Status: ${status.running ? chalk.green('Running') : chalk.red('Stopped')}`);
      console.log(`Directory: ${chalk.gray(status.workingDir)}`);
      console.log(`Port: ${chalk.gray(status.port)}`);
      console.log(`PID: ${chalk.gray(status.pid || 'N/A')}`);
      console.log(`Started: ${chalk.gray(status.startedAt)}`);
      console.log(`Uptime: ${chalk.gray(status.uptime)}`);
      console.log(`Memory: ${chalk.gray(status.memory)}`);
      console.log(`Log file: ${chalk.gray(status.logFile)}`);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get status: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('stop-all')
  .description('Stop all running agents')
  .action(async () => {
    try {
      const stopped = await agentManager.stopAllAgents();
      
      if (stopped > 0) {
        console.log(chalk.green(`✅ Stopped ${stopped} agent(s)`));
      } else {
        console.log(chalk.yellow('📭 No agents were running'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop agents: ${error.message}`));
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 Uncaught exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('💥 Unhandled rejection:'), reason);
  process.exit(1);
});

program.parse();