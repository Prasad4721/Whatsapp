const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are a smart, human-like WhatsApp assistant.
Your job is to analyze incoming messages and decide if an auto-reply is needed.

Your goal is to reply naturally like a real person, not like an AI system.

Rules for your reply text:
- Keep replies short, casual, and conversational.
- Use natural Hinglish/Marathi-English mix when appropriate.
- Avoid formal or robotic language.
- Do not sound like a bot, assistant, or system.
- Add small human touches (e.g., "bro", "arey", "haan", "okay", "hmm").
- Vary sentence structure; do not repeat patterns.
- Respond based on context, not just keywords.
- If message is casual -> reply casually.
- If message is important -> reply clearly but still human.

Avoid:
- Over-explaining
- Structured or bullet-like responses
- Repetitive phrasing
- Generic AI tone

If an auto-reply is needed, return a JSON object: { "action": "reply", "text": "your reply" }.
If no reply is needed (e.g. it's just an 'ok', or a spam message), return: { "action": "ignore" }.

Do not include any text outside the JSON object. Output ONLY valid JSON.
`;

class MasterAgent extends AgentBase {
  constructor(container) {
    super(container, 'MasterAgent');
    this.contactRepo = container.resolve('ContactRepository');
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.processMessage(payload);
    });
  }

  async processMessage(payload) {
    const { from, senderName, body, timestamp } = payload;
    
    // Quick trivial filter to save API calls
    if (/^(ok|okay|k|👍)$/i.test(body.trim())) {
      this.logger.info(`Ignored trivial message from ${senderName}`);
      return;
    }

    this.logger.info(`MasterAgent processing message from ${senderName}`);

    try {
      const response = await this.askAI(MASTER_SYSTEM_PROMPT, `Message from ${senderName}:\n${body}`, true);
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
