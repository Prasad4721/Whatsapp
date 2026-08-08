const AgentBase = require('../AgentBase');

class VoicePlugin extends AgentBase {
  constructor(container) {
    super(container);
    this.eventBus.subscribe('message.media', async (payload) => {
       await this.handleMedia(payload);
    });
  }

  async handleMedia(payload) {
     try {
       const { rawMessage, from } = payload;
       
       if (!this.groqAdapter) return;
       
       const media = await rawMessage.downloadMedia();
       if (!media) return;
       
       if (media.mimetype.startsWith('audio/')) {
         this.logger.info(`VoicePlugin: Processing audio note from ${from}`);
         
         const transcription = await this.groqAdapter.transcribeAudio(media.data, media.mimetype);
         
         // Repackage as a normal text message for the pipeline
         this.eventBus.publish('message.received', {
            ...payload,
            body: `[Voice Note Attached] Transcription: "${transcription}"`
         });
       }
     } catch (err) {
       this.logger.error(`VoicePlugin Error: ${err.message}`);
     }
  }
}

module.exports = VoicePlugin;
