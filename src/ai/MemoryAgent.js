const AgentBase = require('./AgentBase');

const MEMORY_EXTRACTION_PROMPT = `
You are a Memory Extraction Agent for an Executive Assistant.
Your task is to analyze the following message and extract any important facts, preferences, or personal details about the sender that should be remembered for future context.
Ignore transient information (e.g., "I'm going to the store now"). Focus on long-term facts (e.g., "I am allergic to peanuts", "My daughter's name is Sarah", "I prefer meetings in the afternoon").

If there is nothing important to remember, return:
{ "memories": [] }

If there are facts to remember, return a JSON array of strings:
{ "memories": ["Fact 1", "Fact 2"] }

Do not include any text outside the JSON object.
`;

class MemoryAgent extends AgentBase {
  constructor(container) {
    super(container, 'MemoryAgent');
    this.memoryRepo = container.resolve('MemoryRepository');
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.extractMemories(payload);
    });
  }

  async extractMemories(payload) {
    const { from, senderName, body } = payload;
    
    // Quick trivial filter to save API calls
    if (/^(ok|okay|k|👍|hi|hello|hey|morning|gm|gn)$/i.test(body.trim())) {
      return;
    }

    try {
      this.logger.info(`MemoryAgent analyzing message from ${senderName} for memories`);
      const response = await this.askAI(MEMORY_EXTRACTION_PROMPT, `Message from ${senderName}:\n${body}`, true);
      
      if (!response) return;

      const parsed = JSON.parse(response);
      if (parsed.memories && Array.isArray(parsed.memories) && parsed.memories.length > 0) {
        for (const memory of parsed.memories) {
          this.memoryRepo.save({
            contactId: from,
            content: memory
          });
          this.logger.info(`MemoryAgent saved memory for ${senderName}: ${memory}`);
        }
      }
    } catch (err) {
      this.logger.error(`MemoryAgent failed to extract memories: ${err.message}`);
    }
  }
}

module.exports = MemoryAgent;
