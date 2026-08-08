const cron = require('node-cron');

class FollowUpScheduler {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.contactRepo = container.resolve('ContactRepository');
    this.tasks = [];
  }

  start() {
    this.logger.info('Starting FollowUpScheduler...');
    // Run every day at 9 AM
    const task = cron.schedule('0 9 * * *', () => {
      this.checkFollowUps();
    });
    this.tasks.push(task);
  }

  checkFollowUps() {
    try {
      const allContacts = this.contactRepo.findAll();
      const now = new Date();
      
      for (const [id, contact] of Object.entries(allContacts)) {
        if (contact.relationship === 'VIP' || contact.relationship === 'Client') {
          const lastSeen = contact.lastSeen ? new Date(contact.lastSeen) : null;
          
          if (lastSeen) {
            const diffDays = (now - lastSeen) / (1000 * 60 * 60 * 24);
            if (diffDays >= 7) {
              this.logger.info(`Follow-up needed for ${contact.name || id}`);
              // Publish an internal notification
              this.eventBus.publish('log', {
                level: 'info',
                message: `⚠️ Action Required: You haven't spoken to ${contact.name || id} (${contact.relationship}) in ${Math.floor(diffDays)} days.`
              });
            }
          }
        }
      }
    } catch (err) {
      this.logger.error(`FollowUpScheduler failed: ${err.message}`);
    }
  }

  stop() {
    this.tasks.forEach(t => t.stop());
    this.logger.info('FollowUpScheduler stopped.');
  }
}

module.exports = FollowUpScheduler;
