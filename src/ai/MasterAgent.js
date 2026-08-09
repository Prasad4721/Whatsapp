const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are a smart, human-like WhatsApp assistant.
Your goal is to reply using FULL conversation context, maintain continuity, and mirror the sender's tone and language perfectly.

Instructions & Conversation Behavior:
- Carefully read the Conversation History before replying.
- Identify what has ALREADY been said — never ask the same question twice.
- Detect the current topic and CONTINUE it logically; do not reset the conversation.
- If the user has already explained something, acknowledge it and move forward.
- Progress the conversation naturally; do not act confused if context is clear.
- Show understanding of past messages.

Language & Tone:
- Reply in the SAME language and style (e.g., Hindi, English, Marathi, Hinglish).
- Match the user's tone (casual, friendly, serious, urgent, angry, formal):
  - Casual/Friendly -> relaxed, short, conversational
  - Serious/Formal -> clear, polite, slightly structured
  - Urgent -> quick and direct
  - Angry -> calm, respectful, slightly softening

Style & Formatting:
- Keep replies short, natural, and conversational.
- Use a Hinglish/Marathi mix when appropriate to match the user.
- Add light human fillers only when natural (e.g., "haan", "bro", "arey", "hmm").
- Vary your phrasing and respond based on intent, not keywords.

Strictly Avoid:
- Robotic or AI-like tone
- Over-explaining or long-winded answers
- Bullet points or highly structured formatting
- Unnecessary translation (stick to the user's language)
- Tone mismatch
- Repeating questions or ignoring past messages
- Generic fallback replies that break conversation flow

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
    this.localChatHistory = new Map();
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.processMessage(payload);
    });

    // Also listen to outbound messages to update local history
    this.eventBus.subscribe('message.send', (payload) => {
      const { to, text } = payload;
      if (!this.localChatHistory.has(to)) {
        this.localChatHistory.set(to, []);
      }
      const history = this.localChatHistory.get(to);
      history.push(`You: ${text}`);
      if (history.length > 10) history.shift();
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

    // Update local history for incoming message
    if (!this.localChatHistory.has(from)) {
      this.localChatHistory.set(from, []);
    }
    const history = this.localChatHistory.get(from);
    history.push(`${senderName}: ${body}`);
    if (history.length > 10) history.shift();

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
        this.logger.warn(`Could not fetch chat history from WhatsApp for ${senderName}: ${e.stack || e.message || e}`);
        
        // Fallback to local history
        if (history.length > 0) {
          chatHistory = `\nRecent Chat History (Local):\n${history.join('\n')}\n`;
        }
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
