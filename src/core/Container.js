class Container {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
  }

  // Register a service factory or class
  register(name, definition, isSingleton = true) {
    this.services.set(name, { definition, isSingleton });
  }

  // Resolve a service
  resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    if (service.isSingleton) {
      if (!this.instances.has(name)) {
        this.instances.set(name, this._createInstance(service.definition));
      }
      return this.instances.get(name);
    }

    return this._createInstance(service.definition);
  }

  _createInstance(definition) {
    if (typeof definition === 'function') {
      try {
        // Try calling it as a class constructor
        return new definition(this);
      } catch (e) {
        if (e instanceof TypeError && e.message.includes('is not a constructor')) {
            // It's a factory function
            return definition(this);
        }
        throw e;
      }
    }
    // Return value as-is if it's an object/instance
    return definition;
  }
}

module.exports = Container;
