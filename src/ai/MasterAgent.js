const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are a smart, human-like WhatsApp assistant.

Your goal is to reply using FULL conversation context and maintain continuity.

Instructions:

- Carefully read the Conversation History before replying.
- Identify what has ALREADY been said — never ask the same thing again.
- Detect current topic and CONTINUE it logically (do not reset conversation).
- If user already explained something -> acknowledge it and move forward.

Conversation Behavior:

- Do NOT repeat questions if user already explained.
- Do NOT act confused if context is clear.
- Progress the conversation instead of restarting it.
- Show understanding of past messages.

Language & Tone:

- Reply in SAME language and style (Hinglish/Marathi/English)
- Match tone (casual, serious, etc.)
- Keep replies short and natural

Style:

- Human-like, not robotic
- Use light fillers when natural ("arey", "bro", "haan")
- Avoid repetition

Avoid:

- Asking same question again
- Ignoring past messages
- Generic fallback replies
- Breaking conversation flow

If an auto-reply is needed, return a JSON object: { "action": "reply", "text": "your reply" }.
If no reply is needed (e.g. it's just an 'ok', or a spam message), return: { "action": "ignore" }.

Do not include any text outside the JSON object. Output ONLY valid JSON.
`;

class MasterAgent extends AgentBase {
  constructor(container) {
    super(container, 'MasterAgent');
    this.contactRepo = container.resolve('ContactRepository');
    this.memoryRepo = container.resolve('MemoryRepository');
    this.whatsappAdapter = container.resolve('WhatsAppAdapter');
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
        if (this.whatsappAdapter && this.whatsappAdapter.client) {
          const chat = await this.whatsappAdapter.client.getChatById(from);
          if (chat) {
            const messages = await chat.fetchMessages({ limit: 8 });
            const historyLines = messages.map(m => {
              const sender = m.fromMe ? 'You' : senderName;
              return `${sender}: ${m.body}`;
            });
            chatHistory = `\nRecent Chat History:\n${historyLines.join('\n')}\n`;
          }
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
