const AgentBase = require('../AgentBase');

class VisionPlugin extends AgentBase {
  constructor(container) {
    super(container);
    this.eventBus.subscribe('message.media', async (payload) => {
       await this.handleMedia(payload);
    });
  }

  async handleMedia(payload) {
     try {
       const { rawMessage, from } = payload;
       
       // Optimization: only process if we have GroqAdapter
       if (!this.groqAdapter) return;
       
       const media = await rawMessage.downloadMedia();
       if (!media) return;
       
       if (media.mimetype.startsWith('image/')) {
         this.logger.info(`VisionPlugin: Processing image from ${from}`);
         
         const analysis = await this.groqAdapter.analyzeImage(media.data, media.mimetype);
         
         // Repackage as a normal text message and re-inject it into the standard pipeline
         this.eventBus.publish('message.received', {
            ...payload,
            body: `[Image Attached] System Analysis: ${analysis}`
         });
       }
     } catch (err) {
       this.logger.error(`VisionPlugin Error: ${err.message}`);
     }
  }
}

module.exports = VisionPlugin;
