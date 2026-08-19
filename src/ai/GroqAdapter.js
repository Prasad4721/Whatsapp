const axios = require('axios');

class GroqAdapter {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.config = container.resolve('Config');
  }

  async generateCompletion(systemPrompt, userPrompt, jsonMode = false, maxTokens = 1024) {
    try {
      let actualModel = this.config.groq.model || 'llama3-8b-8192';

      // CRITICAL FIX: The `groq/compound` router completely ignores max_tokens and 
      // assumes 6000+ tokens per request, instantly hitting the 8000 TPM limit 
      // when multiple background agents run concurrently. We force background JSON 
      // agents to use openai/gpt-oss-20b, which perfectly respects max_tokens AND json_object.
      if (jsonMode && actualModel.includes('compound')) {
        actualModel = 'openai/gpt-oss-20b';
      }

      const payload = {
        model: actualModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        max_completion_tokens: maxTokens, // For OpenAI-compatible endpoints that require this instead
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const response = await axios.post(
        this.config.groq.endpoint || 'https://api.groq.com/openai/v1/chat/completions',
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.config.groq.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const raw = response.data?.choices?.[0]?.message?.content;
      if (!raw) {
        this.logger.error('Groq API returned no content');
        return null;
      }

      return raw.trim();
    } catch (err) {
      if (err.response) {
        this.logger.error(`Groq API error ${err.response.status}`, { data: err.response.data });
      } else {
        this.logger.error(`Groq API request failed: ${err.message}`);
      }
      return null;
    }
  }

  // Vision API Stub
  async analyzeImage(base64Data, mimeType) {
    this.logger.info('GroqAdapter: Analyzing image via Vision API...');
    // Real implementation would POST to Groq's Vision endpoint
    // using model: 'llama-3.2-11b-vision-preview'
    // with payload { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } }
    return "[Image Analysis: A parsed visual representation goes here]";
  }

  // Audio API Stub
  async transcribeAudio(base64Data, mimeType) {
    this.logger.info('GroqAdapter: Transcribing audio via Whisper API...');
    // Real implementation would POST multipart/form-data to Groq's Whisper endpoint
    // using model: 'whisper-large-v3'
    return "This is a transcribed voice note.";
  }

  // Document Extraction Stub
  async extractDocumentText(base64Data, mimeType) {
    this.logger.info('GroqAdapter: Extracting document text...');
    // Real implementation would use PDF.js or an OCR API
    return "Document content extracted here.";
  }
}

module.exports = GroqAdapter;
