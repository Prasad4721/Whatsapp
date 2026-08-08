const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners to avoid warnings when multiple plugins register
    this.setMaxListeners(50);
  }

  // Wrapper for emit that could later include logging or metrics
  publish(event, payload) {
    return this.emit(event, payload);
  }

  // Wrapper for on
  subscribe(event, handler) {
    this.on(event, handler);
    return () => this.off(event, handler); // return unsubscribe function
  }
}

module.exports = EventBus;
