class AgentBase {
  constructor(container, name) {
    this.container = container;
    this.name = name;
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.groqAdapter = container.resolve('GroqAdapter');
  }

  async execute(taskDescription, context = {}) {
    throw new Error('execute() must be implemented by subclasses');
  }

  async askAI(systemPrompt, userPrompt, jsonMode = false) {
    return this.groqAdapter.generateCompletion(systemPrompt, userPrompt, jsonMode);
  }
}

module.exports = AgentBase;
