const logger = require('../logger');
const db = require('../db');
const { analyzeMessage } = require('../ai/analyzer');
const { formatAnalysis } = require('../utils/formatter');
const { config } = require('../config');

async function handleIncomingMessage(msg, client) {
  try {
    if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') return;
    if (msg.fromMe) return; // we only analyze incoming messages, not our own
    if (!msg.body || msg.body.trim().length === 0) return; // skip media-only with no caption for now

    const chat = await msg.getChat();
    const contact = await msg.getContact();

    if (config.whatsapp.ignoreGroups && chat.isGroup) return;
    if (config.whatsapp.ignoreStatus && chat.isReadOnly) return;

    const senderName = contact.pushname || contact.name || contact.number || 'Unknown';
    const chatId = chat.id._serialized;

    const savedContact = db.getContact(chatId);
    db.upsertContact(chatId, { name: senderName, isGroup: chat.isGroup });

    const contextMessages = db.getConversationContext(chatId);

    logger.info(`Incoming message from ${senderName}: "${msg.body}"`, { chatId, length: msg.body.length });

    const analysis = await analyzeMessage({
      messageText: msg.body,
      senderName,
      relationship: savedContact?.relationship || 'Unknown',
      isGroup: chat.isGroup,
      contextMessages,
    });

    // Store lightweight context for future tone-matching (not full history forever).
    db.pushConversationContext(chatId, { fromMe: false, body: msg.body, at: new Date().toISOString() });

    // Log message metadata for weekly analytics (not full raw content, to limit exposure).
    db.logMessageMeta({
      chatId,
      senderName,
      category: analysis.category,
      priority: analysis.priority,
      notified: analysis.notify_user,
      at: new Date().toISOString(),
    });


    // Print formatted output to terminal.
    console.log(
      formatAnalysis({ senderName, chatId, isGroup: chat.isGroup, messageText: msg.body }, analysis)
    );

    const state = require('../state');

    if (config.behavior.autoReplyEnabled && analysis.reply_suggestions && analysis.reply_suggestions.length > 0) {
      const replyText = analysis.reply_suggestions[0];
      logger.info(`Auto-replying to ${senderName} with: "${replyText}"`);
      
      // Strip @c.us or @lid suffix to prevent mismatches
      const rawId = chatId.split('@')[0];
      
      // Mark this chat as actively being replied to by the bot (ignore subsequent unread/message events)
      state.botReplyingChats.add(rawId);
      
      try {
        const sentMsg = await client.sendMessage(chatId, replyText);
        if (sentMsg && sentMsg.id) {
          state.botMessageIds.add(sentMsg.id._serialized);
          // Clean up the ID after 1 minute to prevent memory leak
          setTimeout(() => {
            state.botMessageIds.delete(sentMsg.id._serialized);
          }, 60000);
        }
      } finally {
        // Remove the flag after 30 seconds (network delays can cause unread_count events to arrive late)
        setTimeout(() => {
          state.botReplyingChats.delete(rawId);
        }, 30000);
      }
    }

    if (analysis.notify_user && analysis.priority_score >= config.behavior.notifyThreshold) {
      logger.info(`NOTIFY: ${senderName} — ${analysis.notify_reason}`, {
        priority: analysis.priority,
        score: analysis.priority_score,
      });
    }

    if (analysis.security_flag && analysis.security_flag !== 'none') {
      logger.warn(`Security flag raised: ${analysis.security_flag}`, { chatId, senderName });
    }
  } catch (err) {
    logger.error(`Error handling incoming message: ${err.message}`, { stack: err.stack });
  }
}

module.exports = { handleIncomingMessage };
