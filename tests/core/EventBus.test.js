const EventBus = require('../../src/core/EventBus');

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should publish and subscribe to events', () => {
    const handler = jest.fn();
    eventBus.subscribe('test-event', handler);
    eventBus.publish('test-event', { data: 123 });
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ data: 123 });
  });

  it('should allow unsubscribing', () => {
    const handler = jest.fn();
    const unsubscribe = eventBus.subscribe('test-event', handler);
    
    unsubscribe();
    eventBus.publish('test-event', { data: 123 });
    
    expect(handler).not.toHaveBeenCalled();
  });
});
