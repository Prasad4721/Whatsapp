const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are the Master Agent for an AI Executive Assistant on WhatsApp.
Your job is to analyze incoming messages and decide if an auto-reply is needed.
If an auto-reply is needed, return a JSON object: { "action": "reply", "text": "your reply" }.
If no reply is needed (e.g. it's just an 'ok', or a spam message), return: { "action": "ignore" }.
Do not include any text outside the JSON object.
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
    const { from, body, timestamp } = payload;
    
    // Quick trivial filter to save API calls
    if (/^(ok|okay|k|👍)$/i.test(body.trim())) {
      this.logger.info(`Ignored trivial message from ${from}`);
      return;
    }

    this.logger.info(`MasterAgent processing message from ${from}`);

    try {
      const response = await this.askAI(MASTER_SYSTEM_PROMPT, `Message from ${from}:\n${body}`, true);
      if (!response) return;

      const parsed = JSON.parse(response);
      if (parsed.action === 'reply' && parsed.text) {
        this.logger.info(`MasterAgent decided to reply to ${from}`);
        this.eventBus.publish('message.send', {
          to: from,
          text: parsed.text
        });
      } else {
        this.logger.info(`MasterAgent ignored message from ${from}`);
      }
    } catch (err) {
      this.logger.error(`MasterAgent failed to process message: ${err.message}`);
    }
  }
}

module.exports = MasterAgent;
