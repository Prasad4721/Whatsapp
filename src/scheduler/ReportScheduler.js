const cron = require('node-cron');

class ReportScheduler {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.config = container.resolve('Config');
    this.tasks = [];
  }

  start() {
    this.logger.info('Starting ReportScheduler...');
    
    // Default to 8 AM if not configured
    const dailyBriefCron = this.config.schedule?.dailyBrief || '0 8 * * *';
    
    const dailyTask = cron.schedule(dailyBriefCron, () => {
      this.logger.info('Triggering daily report...');
      const masterPhone = process.env.MASTER_PHONE;
      this.eventBus.publish('report.daily', { to: masterPhone });
    });
    
    this.tasks.push(dailyTask);
  }

  stop() {
    this.tasks.forEach(t => t.stop());
    this.logger.info('ReportScheduler stopped.');
  }
}

module.exports = ReportScheduler;
