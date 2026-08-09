const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are a smart, human-like WhatsApp assistant.

Your goal is to analyze the sender’s message and reply like a real person in the SAME language, tone, and style.

- Detect language (Hindi, English, Marathi, Hinglish, etc.) and mirror it naturally.
- Detect tone (casual, friendly, serious, urgent, angry, formal) and match it:
  - Casual/Friendly -> relaxed, short, conversational
  - Serious/Formal -> clear, polite, slightly structured
  - Urgent -> quick and direct
  - Angry -> calm, respectful, slightly softening

Style:
- Keep replies short, natural, and conversational
- Use Hinglish/Marathi mix when appropriate
- Add light human fillers only when natural (e.g., "haan", "bro", "arey", "hmm")
- Vary phrasing; avoid repetition
- Respond based on intent, not keywords

Avoid:
- Robotic or AI-like tone
- Over-explaining
- Bullet/structured formatting
- Unnecessary translation
- Tone mismatch

If an auto-reply is needed, return a JSON object: { "action": "reply", "text": "your reply" }.
If no reply is needed (e.g. it's just an 'ok', or a spam message), return: { "action": "ignore" }.

Do not include any text outside the JSON object. Output ONLY valid JSON.
`;

class MasterAgent extends AgentBase {
  constructor(container) {
    super(container, 'MasterAgent');
    this.contactRepo = container.resolve('ContactRepository');
    this.memoryRepo = container.resolve('MemoryRepository');
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.processMessage(payload);
    });
  }

  async processMessage(payload) {
    const { from, senderName, body, timestamp, rawMessage } = payload;
    
    // Quick trivial filter to save API calls
    if (/^(ok|okay|k|👍)$/i.test(body.trim())) {
      this.logger.info(`Ignored trivial message from ${senderName}`);
      return;
    }

    this.logger.info(`MasterAgent processing message from ${senderName}`);

    try {
      // Fetch memories
      const memories = this.memoryRepo.findAllByContact(from).map(m => m.content || m.memory);
      let memoryContext = '';
      if (memories.length > 0) {
        memoryContext = `\nKnown facts/memories about ${senderName}:\n- ${memories.join('\n- ')}\n`;
      }

      // Fetch chat history
      let chatHistory = '';
      try {
        if (rawMessage && typeof rawMessage.getChat === 'function') {
          const chat = await rawMessage.getChat();
          const messages = await chat.fetchMessages({ limit: 8 });
          const historyLines = messages.map(m => {
            const sender = m.fromMe ? 'You' : senderName;
            return `${sender}: ${m.body}`;
          });
          chatHistory = `\nRecent Chat History:\n${historyLines.join('\n')}\n`;
        }
      } catch (e) {
        this.logger.warn(`Could not fetch chat history for ${senderName}: ${e.message}`);
      }

      const promptContext = `${memoryContext}${chatHistory}\nNew Message from ${senderName}:\n${body}`;

      const response = await this.askAI(MASTER_SYSTEM_PROMPT, promptContext, true);
      if (!response) return;

      const parsed = JSON.parse(response);
      if (parsed.action === 'reply' && parsed.text) {
        this.logger.info(`MasterAgent decided to reply to ${senderName}`);
        this.eventBus.publish('message.send', {
          to: from,
          text: parsed.text
        });
      } else {
        this.logger.info(`MasterAgent ignored message from ${senderName}`);
      }
    } catch (err) {
      this.logger.error(`MasterAgent failed to process message: ${err.message}`);
    }
  }
}

module.exports = MasterAgent;
