module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!tests/**/*'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  
  // Group tests by type
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['**/tests/claude-client.test.js', '**/tests/slack-bot.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testEnvironment: process.env.RUN_INTEGRATION_TESTS ? 'node' : '<rootDir>/tests/skip-environment.js',
      testMatch: ['**/tests/integration.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testEnvironment: process.env.RUN_E2E_TESTS ? 'node' : '<rootDir>/tests/skip-environment.js',
      testMatch: ['**/tests/e2e.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 120000
    }
  ]
};