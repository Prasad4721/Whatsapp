const axios = require('axios');

class GroqAdapter {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.config = container.resolve('Config');
  }

  async generateCompletion(systemPrompt, userPrompt, jsonMode = false) {
    try {
      const payload = {
        model: this.config.groq.model || 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024, // Groq calculates TPM as (Input + Max Tokens). We must limit this to avoid 429s on small models.
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
