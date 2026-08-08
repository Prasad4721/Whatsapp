const AgentBase = require('./AgentBase');

const CONTACT_ANALYSIS_PROMPT = `
You are a CRM (Customer Relationship Management) Agent for an Executive Assistant.
Your task is to analyze the incoming message and determine if we can extract or update the sender's name and relationship to the user.
The relationship should be classified as one of: "Friend", "Family", "Client", "Colleague", "VIP", "Uncategorized".
Look for clues like "Hi, this is John", "Hey bro", "Attached is the invoice for our client", etc.

If you can confidently infer the name or relationship, return a JSON object with one or both fields:
{ "name": "John Doe", "relationship": "Client" }

If you cannot infer anything new, return an empty JSON object:
{}

Do not include any text outside the JSON object.
`;

class ContactAgent extends AgentBase {
  constructor(container) {
    super(container, 'ContactAgent');
    this.contactRepo = container.resolve('ContactRepository');
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.analyzeContact(payload);
    });
  }

  async analyzeContact(payload) {
    const { from, senderName, body } = payload;
    
    // Check existing contact
    const existing = this.contactRepo.findById(from) || {};
    
    // Auto-update name if it's new
    if (senderName !== from && existing.name !== senderName) {
      this.contactRepo.upsert(from, { name: senderName });
      existing.name = senderName; // Keep local ref updated for prompt
    }

    // Quick trivial filter
    if (/^(ok|okay|k|👍|hi|hello|hey|gm|gn)$/i.test(body.trim())) {
      // Just update lastSeen
      this.contactRepo.upsert(from, { lastSeen: new Date().toISOString() });
      return;
    }

    try {
      this.logger.info(`ContactAgent analyzing message from ${senderName}`);
      const prompt = `Current Profile: ${JSON.stringify(existing)}\nMessage from ${senderName}:\n${body}`;
      
      const response = await this.askAI(CONTACT_ANALYSIS_PROMPT, prompt, true);
      
      if (!response) {
        // Still update lastSeen
        this.contactRepo.upsert(from, { lastSeen: new Date().toISOString() });
        return;
      }

      const parsed = JSON.parse(response);
      const updates = { lastSeen: new Date().toISOString() };
      
      if (parsed.name && parsed.name !== existing.name) {
        updates.name = parsed.name;
        this.logger.info(`ContactAgent identified name for ${senderName}: ${parsed.name}`);
      }
      
      if (parsed.relationship && parsed.relationship !== existing.relationship) {
        updates.relationship = parsed.relationship;
        this.logger.info(`ContactAgent identified relationship for ${senderName}: ${parsed.relationship}`);
      }
      
      this.contactRepo.upsert(from, updates);
      
    } catch (err) {
      this.logger.error(`ContactAgent failed to analyze contact: ${err.message}`);
      // Ensure we at least record that they were seen
      this.contactRepo.upsert(from, { lastSeen: new Date().toISOString() });
    }
  }
}

module.exports = ContactAgent;
