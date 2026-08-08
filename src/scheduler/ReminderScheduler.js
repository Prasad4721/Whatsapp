const cron = require('node-cron');

class ReminderScheduler {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.eventBus = container.resolve('EventBus');
    this.taskRepo = container.resolve('TaskRepository');
    this.tasks = []; // to store cron instances
  }

  start() {
    this.logger.info('Starting ReminderScheduler...');
    // Run every minute to check for due tasks
    const task = cron.schedule('* * * * *', () => {
      this.checkReminders();
    });
    this.tasks.push(task);
  }

  checkReminders() {
    try {
      const allTasks = this.taskRepo.findAll();
      const now = new Date();
      
      for (const [id, task] of Object.entries(allTasks)) {
        if (task.status === 'pending' && task.dueDate) {
          const dueDate = new Date(task.dueDate);
          if (dueDate <= now) {
            // Task is due! Send reminder
            this.logger.info(`Reminder due for task: ${task.title} (Contact: ${task.contactId})`);
            
            this.eventBus.publish('message.send', {
              to: task.contactId,
              text: `⏰ Reminder: ${task.title}`
            });
            
            this.taskRepo.markCompleted(id);
          }
        }
      }
    } catch (err) {
      this.logger.error(`ReminderScheduler failed: ${err.message}`);
    }
  }

  stop() {
    this.tasks.forEach(t => t.stop());
    this.logger.info('ReminderScheduler stopped.');
  }
}

module.exports = ReminderScheduler;
