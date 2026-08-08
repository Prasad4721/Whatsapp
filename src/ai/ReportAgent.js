const AgentBase = require('./AgentBase');

const REPORT_PROMPT = `
You are an AI Executive Assistant. 
Given the following tasks and contacts data, write a highly professional, concise morning briefing for your executive.
Focus on tasks that are pending, especially those due soon, and highlight any VIPs they haven't interacted with recently.
Do not invent information. Present it beautifully.
`;

class ReportAgent extends AgentBase {
  constructor(container) {
    super(container);
    this.taskRepo = container.resolve('TaskRepository');
    this.contactRepo = container.resolve('ContactRepository');
    
    this.eventBus.subscribe('report.daily', async (payload) => {
       await this.generateDailyReport(payload.to);
    });
  }

  async generateDailyReport(to) {
     try {
       const tasks = this.taskRepo.findAll();
       const contacts = this.contactRepo.findAll();
       
       const pendingTasks = Object.values(tasks).filter(t => t.status === 'pending');
       const vips = Object.values(contacts).filter(c => c.relationship === 'VIP' || c.relationship === 'Client');
       
       const prompt = `Current Time: ${new Date().toISOString()}\nPending Tasks: ${JSON.stringify(pendingTasks)}\nVIP Contacts: ${JSON.stringify(vips)}`;
       
       const response = await this.askAI(REPORT_PROMPT, prompt, false);
       
       if (response) {
          this.logger.info('Generated Daily Briefing.');
          if (to) {
            this.eventBus.publish('message.send', { to, text: response });
          } else {
            // Log it out for the dashboard if no master phone is configured
            this.eventBus.publish('log', { level: 'info', message: `DAILY BRIEFING:\n${response}` });
          }
       }
     } catch (err) {
       this.logger.error(`Failed to generate daily report: ${err.message}`);
     }
  }
}

module.exports = ReportAgent;
