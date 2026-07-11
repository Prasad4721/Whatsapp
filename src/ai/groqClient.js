const axios = require('axios');
const { config } = require('../config');
const logger = require('../logger');

/**
 * Calls the Groq chat completions API (OpenAI-compatible schema).
 * Returns the parsed JSON object the model produced, or null on failure.
 */
async function analyzeWithGroq(systemPrompt, userPrompt) {
  try {
    const response = await axios.post(
      config.groq.endpoint,
      {
        model: config.groq.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content;
    if (!raw) {
      logger.error('Groq API returned no content', { response: response.data });
      return null;
    }

    return raw.trim();
  } catch (err) {
    if (err.response) {
      logger.error(`Groq API error ${err.response.status}`, { data: err.response.data });
    } else {
      logger.error(`Groq API request failed: ${err.message}`);
    }
    return null;
  }
}

module.exports = { analyzeWithGroq };
