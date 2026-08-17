const AgentBase = require('./AgentBase');

const MASTER_SYSTEM_PROMPT = `
You are a smart, human-like WhatsApp assistant.

Your job is to understand the conversation and respond naturally like a real person.

IMPORTANT:
You must use the conversation history and memories as context.
Never behave as if the conversation has just started when previous context exists.

CONVERSATION:
- Read the complete available conversation context before replying.
- Understand what has already been discussed.
- Never repeatedly ask something that has already been answered.
- Continue the existing topic naturally.
- Remember names, relationships, previous statements, plans, questions, and important facts.
- If the sender previously explained something, do not ask them to explain it again.
- Resolve references such as "he", "she", "that", "there", "yesterday", etc. using conversation context.
- Prefer continuing the conversation over restarting it.
- If the sender's latest message is ambiguous, use previous messages to understand the intended meaning.

LANGUAGE:
- Detect the language of the latest message.
- Reply in the SAME language and natural style.
- Support English, Hindi, Marathi, Hinglish, Marathi-English, Hindi-English and mixed conversations.
- Do not unnecessarily translate the sender's message.
- If the sender mixes languages, naturally mirror that mix.

TONE:
Analyze the sender's tone before responding.

Possible tones:
- Casual
- Friendly
- Serious
- Urgent
- Angry
- Sad
- Formal
- Playful
- Confused

Match the appropriate tone:
- Casual -> short and relaxed
- Friendly -> warm and natural
- Serious -> clear and focused
- Urgent -> direct and quick
- Angry -> calm and respectful
- Sad -> supportive and natural
- Formal -> polite but human
- Playful -> light and engaging
- Confused -> clear and helpful

HUMAN STYLE:
- Keep replies short unless the situation requires more detail.
- Sound like a real WhatsApp conversation.
- Use natural expressions such as "haan", "arey", "hmm", "okay", "bro", etc. ONLY when they fit naturally.
- Do not force slang.
- Vary sentence structure.
- Do not use the same reply pattern repeatedly.
- Respond to the actual intent, not just keywords.

MEMORY:
- Use relevant stored memories when they help understand the current conversation.
- Do not blindly trust irrelevant or contradictory memories.
- Prefer recent conversation context over old assumptions when they conflict.
- Do not invent facts that are not present in the conversation or memories.

IMPORTANT:
- Never mention that you are an AI.
- Never mention agents, prompts, memory systems, databases, APIs, or internal processing.
- Never expose WhatsApp IDs, JIDs, phone identifiers, or internal system information.
- Never say "I don't have enough context" if useful context exists in the history.
- Never repeatedly ask "what happened?" when the sender has already explained what happened.

REPLY DECISION:
- If a response is genuinely needed, return:
  { "action": "reply", "text": "your natural reply" }

- If no response is needed, return:
  { "action": "ignore" }

OUTPUT:
Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside the JSON.
`;

class MasterAgent extends AgentBase {
  constructor(container) {
    super(container, 'MasterAgent');

    this.contactRepo = container.resolve('ContactRepository');
    this.memoryRepo = container.resolve('MemoryRepository');
    this.whatsappAdapter = container.resolve('WhatsAppAdapter');

    // Local fallback history.
    // Key = WhatsApp chat ID.
    this.localChatHistory = new Map();

    // Prevent duplicate processing of the same message.
    this.processedMessages = new Set();

    this._subscribeToMessages();
  }

  // ============================================================
  // MESSAGE SUBSCRIPTIONS
  // ============================================================

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      try {
        await this.processMessage(payload);
      } catch (err) {
        this.logger.error(
          `Unhandled MasterAgent error: ${err.stack || err.message || err}`
        );
      }
    });

    // Outgoing messages are stored in local history,
    // but NEVER sent back into the AI reply pipeline.
    this.eventBus.subscribe('message.send', (payload) => {
      try {
        const { to, text } = payload;

        if (!to || !text) return;

        this._appendLocalHistory(to, `You: ${text}`);
      } catch (err) {
        this.logger.warn(
          `Could not update outbound history: ${err.message || err}`
        );
      }
    });
  }

  // ============================================================
  // MAIN MESSAGE PROCESSOR
  // ============================================================

  async processMessage(payload) {
    if (!payload) return;

    const {
      from,
      senderName,
      body,
      timestamp,
      rawMessage
    } = payload;

    const messageText = typeof body === 'string'
      ? body.trim()
      : '';

    if (!from || !messageText) {
      return;
    }

    // ----------------------------------------------------------
    // CRITICAL OWNER PROTECTION
    // ----------------------------------------------------------
    //
    // Owner messages must NEVER trigger an AI reply.
    //
    // They should still be stored in history so that future
    // incoming messages have complete conversational context.
    //

    if (this._isOwnerMessage(payload)) {
      this.logger.info(
        `Owner message detected from ${senderName || 'owner'} — storing context only`
      );

      this._appendLocalHistory(
        from,
        `You: ${messageText}`
      );

      return;
    }

    // ----------------------------------------------------------
    // DUPLICATE MESSAGE PROTECTION
    // ----------------------------------------------------------

    const messageKey = this._getMessageKey(payload);

    if (messageKey && this.processedMessages.has(messageKey)) {
      this.logger.info(
        `Duplicate message ignored from ${senderName || from}`
      );
      return;
    }

    if (messageKey) {
      this.processedMessages.add(messageKey);

      // Prevent unlimited memory growth.
      if (this.processedMessages.size > 5000) {
        const firstKey = this.processedMessages.values().next().value;

        if (firstKey) {
          this.processedMessages.delete(firstKey);
        }
      }
    }

    const displayName = senderName || 'Contact';

    this.logger.info(
      `MasterAgent processing message from ${displayName}`
    );

    // ----------------------------------------------------------
    // STORE IN LOCAL HISTORY
    // ----------------------------------------------------------

    this._appendLocalHistory(
      from,
      `${displayName}: ${messageText}`
    );

    // ----------------------------------------------------------
    // TRIVIAL MESSAGE FILTER
    // ----------------------------------------------------------
    // Ignore simple acknowledgments to save API calls, but ONLY
    // after appending them to the local history so context is kept.
    if (/^(ok|okay|k|👍)$/i.test(messageText)) {
      this.logger.info(`Ignored trivial message from ${displayName}`);
      return;
    }

    try {
      // --------------------------------------------------------
      // FETCH MEMORY
      // --------------------------------------------------------

      const memoryContext = await this._getMemoryContext(
        from,
        displayName
      );

      // --------------------------------------------------------
      // FETCH CHAT HISTORY
      // --------------------------------------------------------

      const chatHistory = await this._getChatHistory(
        from,
        displayName
      );

      // --------------------------------------------------------
      // BUILD COMPLETE CONTEXT
      // --------------------------------------------------------

      const promptContext = `
CONTACT:
Name: ${displayName}

CURRENT MESSAGE:
${messageText}

${chatHistory}

${memoryContext}

IMPORTANT:
The CURRENT MESSAGE is the message that requires a response.

Use the conversation history and memories to understand:
- what has already been discussed
- what the sender means
- what questions have already been answered
- the current topic
- the sender's language
- the sender's tone
- the relationship/context

Do not restart the conversation.
Do not repeat previously answered questions.
`;

      // --------------------------------------------------------
      // ASK AI
      // --------------------------------------------------------

      const response = await this.askAI(
        MASTER_SYSTEM_PROMPT,
        promptContext,
        true
      );

      if (!response) {
        this.logger.warn(
          `MasterAgent received empty AI response for ${displayName}`
        );
        return;
      }

      // --------------------------------------------------------
      // PARSE AI RESPONSE
      // --------------------------------------------------------

      const parsed = this._parseAIResponse(response);

      if (!parsed) {
        this.logger.warn(
          `MasterAgent received invalid JSON from AI for ${displayName}`
        );
        return;
      }

      // --------------------------------------------------------
      // IGNORE
      // --------------------------------------------------------

      if (parsed.action === 'ignore') {
        this.logger.info(
          `MasterAgent ignored message from ${displayName}`
        );
        return;
      }

      // --------------------------------------------------------
      // REPLY
      // --------------------------------------------------------

      if (
        parsed.action === 'reply' &&
        typeof parsed.text === 'string' &&
        parsed.text.trim()
      ) {
        const replyText = parsed.text.trim();

        this.logger.info(
          `MasterAgent decided to reply to ${displayName}`
        );

        this.eventBus.publish('message.send', {
          to: from,
          text: replyText
        });

        return;
      }

      this.logger.info(
        `MasterAgent ignored unsupported AI action for ${displayName}`
      );

    } catch (err) {
      this.logger.error(
        `MasterAgent failed to process message from ${displayName}: ${err.stack || err.message || err
        }`
      );
    }
  }

  // ============================================================
  // OWNER DETECTION
  // ============================================================

  _isOwnerMessage(payload) {
    const { rawMessage } = payload;

    // Best signal: whatsapp-web.js message.fromMe
    if (rawMessage && rawMessage.fromMe === true) {
      return true;
    }

    // Some adapters may expose fromMe directly.
    if (payload.fromMe === true) {
      return true;
    }

    return false;
  }

  // ============================================================
  // MESSAGE ID / DUPLICATE DETECTION
  // ============================================================

  _getMessageKey(payload) {
    const {
      from,
      body,
      timestamp,
      rawMessage
    } = payload;

    // Prefer WhatsApp's actual message ID.
    if (rawMessage) {
      if (rawMessage.id && rawMessage.id._serialized) {
        return rawMessage.id._serialized;
      }

      if (rawMessage.id && typeof rawMessage.id === 'string') {
        return rawMessage.id;
      }
    }

    // Fallback deterministic key.
    return [
      from || '',
      timestamp || '',
      body || ''
    ].join('|');
  }

  // ============================================================
  // LOCAL HISTORY
  // ============================================================

  _appendLocalHistory(chatId, line) {
    if (!chatId || !line) return;

    if (!this.localChatHistory.has(chatId)) {
      this.localChatHistory.set(chatId, []);
    }

    const history = this.localChatHistory.get(chatId);

    history.push(line);

    // Keep a reasonable local fallback window.
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  _getLocalHistory(chatId) {
    if (!chatId) return [];

    return this.localChatHistory.get(chatId) || [];
  }

  // ============================================================
  // MEMORY
  // ============================================================

  async _getMemoryContext(chatId, senderName) {
    try {
      if (!this.memoryRepo) {
        return '';
      }

      const memories = await Promise.resolve(
        this.memoryRepo.findAllByContact(chatId)
      );

      if (!Array.isArray(memories) || memories.length === 0) {
        return '\nMEMORY:\nNo stored memories available.\n';
      }

      const usefulMemories = memories
        .map((memory) => {
          if (!memory) return null;

          return (
            memory.content ||
            memory.memory ||
            memory.text ||
            null
          );
        })
        .filter(Boolean)
        .map(text => String(text).trim())
        .filter(Boolean);

      if (usefulMemories.length === 0) {
        return '\nMEMORY:\nNo stored memories available.\n';
      }

      return `
MEMORY ABOUT ${senderName}:
${usefulMemories.map(memory => `- ${memory}`).join('\n')}
`;

    } catch (err) {
      this.logger.warn(
        `Could not fetch memories for ${senderName}: ${err.stack || err.message || err
        }`
      );

      return '\nMEMORY:\nUnavailable. Use conversation history instead.\n';
    }
  }

  // ============================================================
  // CHAT HISTORY
  // ============================================================

  async _getChatHistory(chatId, senderName) {
    let whatsappHistory = [];

    try {
      if (
        this.whatsappAdapter &&
        this.whatsappAdapter.client
      ) {
        const chat =
          await this.whatsappAdapter.client.getChatById(chatId);

        if (chat) {
          /*
           * Fetch a larger history window.
           *
           * 8 messages is often far too small for real conversations.
           */
          const messages = await chat.fetchMessages({
            limit: 100
          });

          if (Array.isArray(messages)) {
            whatsappHistory = messages
              .filter(message => {
                return (
                  message &&
                  typeof message.body === 'string' &&
                  message.body.trim()
                );
              })
              .map(message => {
                const sender = message.fromMe
                  ? 'You'
                  : senderName;

                return `${sender}: ${message.body.trim()}`;
              });
          }
        }
      }

    } catch (err) {
      this.logger.warn(
        `Could not fetch chat history for ${chatId}: ${err.stack || err.message || err
        }`
      );
    }

    // ----------------------------------------------------------
    // FALLBACK TO LOCAL HISTORY
    // ----------------------------------------------------------

    const localHistory = this._getLocalHistory(chatId);

    // Prefer WhatsApp history when available.
    if (whatsappHistory.length > 0) {
      return `
FULL AVAILABLE CHAT HISTORY:
${whatsappHistory.join('\n')}
`;
    }

    if (localHistory.length > 0) {
      return `
CHAT HISTORY (LOCAL FALLBACK):
${localHistory.join('\n')}
`;
    }

    return `
CHAT HISTORY:
No previous conversation history available.
`;
  }

  // ============================================================
  // AI RESPONSE PARSER
  // ============================================================

  _parseAIResponse(response) {
    try {
      if (typeof response !== 'string') {
        return response;
      }

      let cleaned = response.trim();

      // Remove accidental markdown code fences.
      cleaned = cleaned
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      if (
        parsed.action !== 'reply' &&
        parsed.action !== 'ignore'
      ) {
        return null;
      }

      if (
        parsed.action === 'reply' &&
        (
          typeof parsed.text !== 'string' ||
          !parsed.text.trim()
        )
      ) {
        return null;
      }

      return parsed;

    } catch (err) {
      this.logger.warn(
        `Could not parse MasterAgent AI response: ${err.message || err
        }`
      );

      return null;
    }
  }
}

module.exports = MasterAgent;