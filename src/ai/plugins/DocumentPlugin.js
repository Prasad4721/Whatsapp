const AgentBase = require('../AgentBase');

class DocumentPlugin extends AgentBase {
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
       
       if (media.mimetype.includes('pdf') || media.mimetype.includes('text/plain')) {
         this.logger.info(`DocumentPlugin: Processing document from ${from}`);
         
         const extractedText = await this.groqAdapter.extractDocumentText(media.data, media.mimetype);
         
         // Repackage as a normal text message for the pipeline
         this.eventBus.publish('message.received', {
            ...payload,
            body: `[Document Attached] Extracted Text: "${extractedText}"`
         });
       }
     } catch (err) {
       this.logger.error(`DocumentPlugin Error: ${err.message}`);
     }
  }
}

module.exports = DocumentPlugin;
