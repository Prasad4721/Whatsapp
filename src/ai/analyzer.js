const chrono = require('chrono-node');
const { config } = require('../config');
const logger = require('../logger');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');
const { analyzeWithGroq } = require('./groqClient');

// Quick local checks so we don't burn an API call on every "ok" / "haha".
const TRIVIAL_PATTERNS = [
  /^(ok|okay|k|kk|hmm|hm|ya|yes|no|yeah|yep|nope|lol|haha+|hehe+|👍|🙏|😂|❤️)$/i,
  /^(good\s?morning|good\s?night|good\s?afternoon|gn|gm)$/i,
];

// OTP / verification code detection — used to SUPPRESS forwarding, not enable it.
const OTP_PATTERN = /\b(otp|one[-\s]?time password|verification code|security code)\b/i;
const CODE_PATTERN = /\b\d{4,8}\b/;

// Rough phishing signal: urgency + money/credentials + a link.
const PHISHING_SIGNAL = /(verify your account|confirm your (password|pin|card)|click here|update your details).{0,80}(http|https):\/\//i;

function isTrivial(text) {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length < config.behavior.triageMinLength && TRIVIAL_PATTERNS.some((p) => p.test(trimmed))) {
    return true;
  }
  return TRIVIAL_PATTERNS.some((p) => p.test(trimmed));
}

function trivialResult(reason) {
  return {
    priority_score: 5,
    priority: 'Low',
    category: 'Unknown',
    sentiment: 'Neutral',
    summary: reason,
    key_points: [],
    action_items: [],
    reminders: [],
    reply_suggestions: [],
    notify_user: false,
    notify_reason: 'Routine/low-signal message, handled locally without an AI call.',
    security_flag: 'none',
    confidence: 90,
    handled_locally: true,
  };
}

/**
 * Converts natural-language deadline text ("tomorrow 6pm", "next Friday") into an ISO date.
 * Returns null if it can't be confidently parsed.
 */
function resolveDueDate(text) {
  if (!text) return null;
  try {
    const parsed = chrono.parseDate(text, new Date(), { forwardDate: true });
    return parsed ? parsed.toISOString() : null;
  } catch (err) {
    logger.warn(`Could not parse date text "${text}": ${err.message}`);
    return null;
  }
}

async function analyzeMessage({ messageText, senderName, relationship, isGroup, contextMessages }) {
  // Pre-filter: OTP codes are never sent to the AI or surfaced in full.
  if (OTP_PATTERN.test(messageText) && CODE_PATTERN.test(messageText)) {
    logger.info('OTP-like message detected locally — suppressing content, skipping AI call.');
    return {
      ...trivialResult('A verification/OTP code was received. Contents withheld for security.'),
      category: 'Finance',
      security_flag: 'otp_code',
      priority: 'Low',
    };
  }

  if (!config.behavior.autoReplyEnabled && isTrivial(messageText)) {
    return trivialResult('Routine message, no action needed.');
  }

  const userPrompt = buildUserPrompt({ messageText, senderName, relationship, isGroup, contextMessages });
  const result = await analyzeWithGroq(SYSTEM_PROMPT, userPrompt);

  if (!result) {
    // Fail safe: never crash the pipeline, never fabricate data.
    return {
      priority_score: 0,
      priority: 'Unknown',
      category: 'Unknown',
      sentiment: 'Neutral',
      summary: 'AI analysis unavailable for this message.',
      key_points: [],
      action_items: [],
      reminders: [],
      reply_suggestions: [],
      notify_user: false,
      notify_reason: 'Analysis failed — check logs/errors.log.',
      security_flag: 'none',
      confidence: 0,
      handled_locally: false,
      error: true,
    };
  }

  // Wrap the plain text reply in a dummy object so the terminal logger and other integrations don't break
  return {
    priority_score: 50,
    priority: 'Unknown',
    category: 'Unknown',
    sentiment: 'Unknown',
    summary: 'Auto-reply generated based on custom prompt.',
    key_points: [],
    action_items: [],
    reminders: [],
    reply_suggestions: [result], // The raw text from the AI
    notify_user: false,
    security_flag: 'none',
    confidence: 100,
  };
}

module.exports = { analyzeMessage };
