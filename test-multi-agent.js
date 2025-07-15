#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const chalk = require('chalk');

class MultiAgentTester {
  constructor() {
    this.testDir = path.join(os.tmpdir(), 'claude-slack-test');
    this.testResults = [];
  }

  async runTests() {
    console.log(chalk.blue('🧪 Multi-Agent System Test Suite\n'));
    
    try {
      await this.setupTestEnvironment();
      
      await this.testCLIBasics();
      await this.testAgentStartupValidation();
      await this.testMultipleAgents();
      await this.testProcessManagement();
      await this.testSessionIsolation();
      await this.testErrorHandling();
      
      await this.cleanup();
      this.printResults();
      
    } catch (error) {
      console.error(chalk.red('💥 Test suite failed:'), error);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('🔧 Setting up test environment...'));
    
    // Create test directories
    await fs.mkdir(this.testDir, { recursive: true });
    await fs.mkdir(path.join(this.testDir, 'project-a'), { recursive: true });
    await fs.mkdir(path.join(this.testDir, 'project-b'), { recursive: true });
    
    // Create test config files
    const testEnv = `SLACK_BOT_TOKEN=xoxb-test-token
SLACK_SIGNING_SECRET=test-secret
SLACK_APP_TOKEN=xapp-test-token`;
    
    await fs.writeFile(path.join(this.testDir, 'test.env'), testEnv);
    
    console.log(chalk.green('✅ Test environment ready\n'));
  }

  async testCLIBasics() {
    console.log(chalk.yellow('📋 Testing CLI basics...'));
    
    // Test help command
    const helpResult = await this.runCommand(['./bin/claude-slack.js', '--help']);
    this.assert(
      helpResult.includes('Manage multiple Claude Slack bot agents'),
      'CLI help displays correctly'
    );
    
    // Test version command
    const versionResult = await this.runCommand(['./bin/claude-slack.js', '--version']);
    this.assert(
      versionResult.includes('1.0.0'),
      'CLI version displays correctly'
    );
    
    // Test list command (may have existing agents)
    const listResult = await this.runCommand(['./bin/claude-slack.js', 'list']);
    this.assert(
      listResult.includes('Running Claude agents') || listResult.includes('No agents currently running'),
      'Agent list command works correctly'
    );
    
    console.log(chalk.green('✅ CLI basics working\n'));
  }

  async testAgentStartupValidation() {
    console.log(chalk.yellow('🚀 Testing agent startup validation...'));
    
    // Test missing alias
    try {
      await this.runCommand(['./bin/claude-slack.js', 'start', '--dir', this.testDir]);
      this.assert(false, 'Should fail without alias');
    } catch (error) {
      this.assert(
        error.message.includes('required option'),
        'Correctly rejects missing alias'
      );
    }
    
    // Test invalid directory
    try {
      await this.runCommand([
        './bin/claude-slack.js', 'start',
        '--alias', 'test-invalid',
        '--dir', '/nonexistent/path'
      ]);
      this.assert(false, 'Should fail with invalid directory');
    } catch (error) {
      this.assert(
        error.message.includes('Working directory does not exist'),
        'Correctly rejects invalid directory'
      );
    }
    
    console.log(chalk.green('✅ Startup validation working\n'));
  }

  async testMultipleAgents() {
    console.log(chalk.yellow('🤖 Testing multiple agents (dry run)...'));
    
    // Note: We can't actually start agents without valid Slack tokens,
    // but we can test the configuration logic
    
    const AgentManager = require('./src/agent-manager');
    const manager = new AgentManager();
    
    // Test configuration persistence
    const config1 = {
      alias: 'test-agent-1',
      workingDir: path.join(this.testDir, 'project-a'),
      port: 4001,
      pid: null,
      startedAt: new Date().toISOString(),
      running: false
    };
    
    const config2 = {
      alias: 'test-agent-2', 
      workingDir: path.join(this.testDir, 'project-b'),
      port: 4002,
      pid: null,
      startedAt: new Date().toISOString(),
      running: false
    };
    
    await manager.saveAgentConfig('test-agent-1', config1);
    await manager.saveAgentConfig('test-agent-2', config2);
    
    const agents = await manager.listAgents();
    const testAgents = agents.filter(a => a.alias.startsWith('test-agent-'));
    
    this.assert(
      testAgents.length >= 2,
      'Multiple agent configurations stored correctly'
    );
    
    this.assert(
      agents.find(a => a.alias === 'test-agent-1') &&
      agents.find(a => a.alias === 'test-agent-2'),
      'Both test agents found in list'
    );
    
    console.log(chalk.green('✅ Multiple agents configuration working\n'));
  }

  async testProcessManagement() {
    console.log(chalk.yellow('⚙️ Testing process management...'));
    
    const AgentManager = require('./src/agent-manager');
    const manager = new AgentManager();
    
    // Test process detection
    const selfRunning = await manager.isProcessRunning(process.pid);
    const fakeRunning = await manager.isProcessRunning(999999);
    
    this.assert(selfRunning, 'Correctly detects running process');
    this.assert(!fakeRunning, 'Correctly detects non-existent process');
    
    // Test uptime calculation
    const uptime = manager.calculateUptime(new Date(Date.now() - 5000).toISOString());
    this.assert(uptime.includes('5s') || uptime.includes('4s'), 'Uptime calculation works');
    
    console.log(chalk.green('✅ Process management working\n'));
  }

  async testSessionIsolation() {
    console.log(chalk.yellow('🔒 Testing session isolation...'));
    
    const ClaudeWrapper = require('./src/claude-wrapper');
    
    const wrapper1 = new ClaudeWrapper('agent-1', path.join(this.testDir, 'project-a'));
    const wrapper2 = new ClaudeWrapper('agent-2', path.join(this.testDir, 'project-b'));
    
    // Verify separate session directories
    this.assert(
      wrapper1.sessionDir.includes('agent-1'),
      'Agent 1 has isolated session directory'
    );
    
    this.assert(
      wrapper2.sessionDir.includes('agent-2'),
      'Agent 2 has isolated session directory'
    );
    
    this.assert(
      wrapper1.workingDir === path.join(this.testDir, 'project-a'),
      'Agent 1 has correct working directory'
    );
    
    this.assert(
      wrapper2.workingDir === path.join(this.testDir, 'project-b'),
      'Agent 2 has correct working directory'
    );
    
    console.log(chalk.green('✅ Session isolation working\n'));
  }

  async testErrorHandling() {
    console.log(chalk.yellow('❌ Testing error handling...'));
    
    const AgentManager = require('./src/agent-manager');
    const manager = new AgentManager();
    
    // Test non-existent agent status
    try {
      await manager.getAgentStatus('nonexistent');
      this.assert(false, 'Should throw error for non-existent agent');
    } catch (error) {
      this.assert(
        error.message.includes('not found'),
        'Correctly handles non-existent agent'
      );
    }
    
    // Test stopping non-existent agent
    const stopped = await manager.stopAgent('nonexistent');
    this.assert(!stopped, 'Correctly handles stopping non-existent agent');
    
    console.log(chalk.green('✅ Error handling working\n'));
  }

  async runCommand(args) {
    return new Promise((resolve, reject) => {
      const child = spawn(args[0], args.slice(1), {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(errorOutput || `Command failed with code ${code}`));
        }
      });
    });
  }

  assert(condition, message) {
    this.testResults.push({
      success: !!condition,
      message
    });
    
    if (condition) {
      console.log(chalk.green(`   ✅ ${message}`));
    } else {
      console.log(chalk.red(`   ❌ ${message}`));
    }
  }

  async cleanup() {
    console.log(chalk.yellow('🧹 Cleaning up test environment...'));
    
    try {
      await fs.rm(this.testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  }

  printResults() {
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(chalk.blue('\n📊 Test Results:'));
    console.log(`${chalk.green(passed)} passed, ${chalk.red(total - passed)} failed, ${total} total`);
    
    if (passed === total) {
      console.log(chalk.green('\n🎉 All tests passed!'));
    } else {
      console.log(chalk.red('\n💥 Some tests failed!'));
      process.exit(1);
    }
  }
}

if (require.main === module) {
  new MultiAgentTester().runTests();
}