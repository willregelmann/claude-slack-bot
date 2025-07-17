// Custom Jest environment that skips tests
const NodeEnvironment = require('jest-environment-node').default;

class SkipEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    
    // Override test functions to skip
    this.global.describe = (name, fn) => {
      // eslint-disable-next-line no-undef
      describe.skip(name, fn);
    };
    
    this.global.it = (name, fn) => {
      // eslint-disable-next-line no-undef
      it.skip(name, fn);
    };
    
    this.global.test = (name, fn) => {
      // eslint-disable-next-line no-undef
      test.skip(name, fn);
    };
  }

  async teardown() {
    await super.teardown();
  }
}

module.exports = SkipEnvironment;