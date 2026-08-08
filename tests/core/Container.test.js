const Container = require('../../src/core/Container');

describe('Container', () => {
  let container;

  beforeEach(() => {
    container = new Container();
  });

  it('should register and resolve a singleton instance', () => {
    class DummyService {
      constructor() { this.value = Math.random(); }
    }
    
    container.register('Dummy', DummyService);
    
    const instance1 = container.resolve('Dummy');
    const instance2 = container.resolve('Dummy');
    
    expect(instance1).toBe(instance2);
  });

  it('should resolve dependencies through the container', () => {
    class ConfigService {
      get() { return 'test-config'; }
    }
    
    class AppService {
      constructor(c) {
        this.config = c.resolve('Config');
      }
    }
    
    container.register('Config', ConfigService);
    container.register('App', AppService);
    
    const app = container.resolve('App');
    expect(app.config.get()).toBe('test-config');
  });
  
  it('should register literal objects', () => {
      const config = { test: 123 };
      container.register('Config', config);
      expect(container.resolve('Config')).toBe(config);
  });
});
