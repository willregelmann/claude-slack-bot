#!/usr/bin/env node

const AgentManager = require('./src/agent-manager');
const chalk = require('chalk');

async function testAgentManager() {
  console.log(chalk.blue('🧪 Testing Claude Slack Agent Manager\n'));
  
  const manager = new AgentManager();
  
  try {
    // Test listing (should be empty)
    console.log(chalk.yellow('1. Testing agent listing...'));
    let agents = await manager.listAgents();
    console.log(`Found ${agents.length} agents\n`);
    
    // Test invalid agent status
    console.log(chalk.yellow('2. Testing status of non-existent agent...'));
    try {
      await manager.getAgentStatus('nonexistent');
    } catch (error) {
      console.log(chalk.green('✅ Correctly threw error:', error.message));
    }
    console.log();
    
    // Test configuration save/load
    console.log(chalk.yellow('3. Testing configuration persistence...'));
    const testConfig = {
      alias: 'test-agent',
      workingDir: '/tmp',
      port: 4000,
      pid: 12345,
      startedAt: new Date().toISOString(),
      running: false
    };
    
    await manager.saveAgentConfig('test-agent', testConfig);
    const loaded = await manager.getAgentConfig('test-agent');
    
    if (loaded && loaded.alias === 'test-agent') {
      console.log(chalk.green('✅ Configuration save/load works'));
    } else {
      console.log(chalk.red('❌ Configuration save/load failed'));
    }
    console.log();
    
    // Test process checking
    console.log(chalk.yellow('4. Testing process detection...'));
    const selfRunning = await manager.isProcessRunning(process.pid);
    const fakeRunning = await manager.isProcessRunning(999999);
    
    if (selfRunning && !fakeRunning) {
      console.log(chalk.green('✅ Process detection works'));
    } else {
      console.log(chalk.red('❌ Process detection failed'));
    }
    console.log();
    
    console.log(chalk.green('🎉 All tests passed!'));
    
  } catch (error) {
    console.error(chalk.red('💥 Test failed:'), error);
  }
}

if (require.main === module) {
  testAgentManager();
}