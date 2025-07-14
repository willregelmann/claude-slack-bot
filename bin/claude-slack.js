#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const AgentManager = require('../src/agent-manager');

const program = new Command();
const agentManager = new AgentManager();

program
  .name('claude-slack')
  .description('Manage multiple Claude Slack bot agents')
  .version('1.0.0');

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