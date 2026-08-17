const AgentBase = require('./AgentBase');

const MEMORY_EXTRACTION_PROMPT = `
You are a Memory Intelligence Agent.

Your goal is to extract only meaningful, long-term information from the conversation.

Instructions:
- Use BOTH the current message and recent conversation context (if available).
- Identify information that is useful for future replies.

Store ONLY:
- Name, nickname, identity clues
- Relationship (friend, client, etc.)
- Language and communication style
- Preferences, habits, recurring patterns
- Important plans, commitments, or repeated topics

Do NOT store:
- One-time casual messages
- Temporary emotions (unless repeated pattern)
- Generic chat (e.g., “ok”, “haan”)
- Irrelevant or sensitive data

Rules:
- Keep memory short and structured
- Update existing memory instead of duplicating
- Prefer summarized facts, not raw sentences

Output:
- Structured short memory lines as a JSON array of strings: { "memories": ["Fact 1", "Fact 2"] }
- If nothing important → return: { "memories": [] }

Do not include any text outside the JSON object. Output ONLY valid JSON.
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
      const response = await this.askAI(MEMORY_EXTRACTION_PROMPT, `Message from ${senderName}:\n${body}`, true, 256);
      
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
