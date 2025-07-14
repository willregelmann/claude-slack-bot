const ClaudeWrapper = require('./src/claude-wrapper');

// Simple test to verify the Claude wrapper works with session management
async function test() {
  const wrapper = new ClaudeWrapper();
  
  console.log('Testing Claude wrapper with session management...');
  
  try {
    // Test 1: Basic execution
    console.log('\n1. Testing basic execution...');
    const response1 = await wrapper.executeCommand('Hello Claude, respond with just "Hello!"', {
      userId: 'test-user',
      channel: 'test-channel',
      threadTs: 'test-thread-1'
    });
    
    console.log('Response 1:', response1);
    
    // Test 2: Session status
    console.log('\n2. Testing session status...');
    const status = wrapper.getSessionStatus({
      userId: 'test-user',
      channel: 'test-channel',
      threadTs: 'test-thread-1'
    });
    
    console.log('Session status:', status);
    
    // Test 3: Second message in same thread (should continue)
    console.log('\n3. Testing session continuity...');
    const response2 = await wrapper.executeCommand('What was my first message?', {
      userId: 'test-user',
      channel: 'test-channel',
      threadTs: 'test-thread-1'
    });
    
    console.log('Response 2:', response2);
    
    // Test 4: New session
    console.log('\n4. Testing new session...');
    const response3 = await wrapper.startNewSession({
      userId: 'test-user',
      channel: 'test-channel',
      threadTs: 'test-thread-2'
    });
    
    console.log('New session response:', response3);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

test();