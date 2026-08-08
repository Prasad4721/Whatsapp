const AgentBase = require('./AgentBase');

const TASK_EXTRACTION_PROMPT = `
You are a Task Extraction Agent for an Executive Assistant.
Analyze the following message and extract any tasks, action items, or reminders the user is committing to or asking to be reminded about.
For example, "remind me to call John tomorrow", "I need to send the invoice by Friday", or "Can you add 'buy milk' to my todo list?".

If there are tasks, return them as a JSON array of objects, each containing a "title" and an optional "dueDate" (in ISO format if you can infer it, otherwise omit it).
{
  "tasks": [
    { "title": "Call John", "dueDate": "2026-08-09T10:00:00Z" }
  ]
}

If no tasks are present, return:
{ "tasks": [] }

Do not include any text outside the JSON object.
`;

class TaskAgent extends AgentBase {
  constructor(container) {
    super(container, 'TaskAgent');
    this.taskRepo = container.resolve('TaskRepository');
    this._subscribeToMessages();
  }

  _subscribeToMessages() {
    this.eventBus.subscribe('message.received', async (payload) => {
      await this.extractTasks(payload);
    });
  }

  async extractTasks(payload) {
    const { from, body } = payload;
    
    // Quick trivial filter
    if (/^(ok|okay|k|👍|hi|hello|hey|gm|gn)$/i.test(body.trim())) {
      return;
    }

    try {
      this.logger.info(`TaskAgent analyzing message from ${from}`);
      const prompt = `Current Time: ${new Date().toISOString()}\nMessage from ${from}:\n${body}`;
      
      const response = await this.askAI(TASK_EXTRACTION_PROMPT, prompt, true);
      
      if (!response) return;

      const parsed = JSON.parse(response);
      
      if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        for (const task of parsed.tasks) {
          const newTask = {
            title: task.title,
            contactId: from,
          };
          
          if (task.dueDate) {
            newTask.dueDate = task.dueDate;
          }
          
          this.taskRepo.save(newTask);
          this.logger.info(`TaskAgent saved task: ${task.title}`);
        }
      }
    } catch (err) {
      this.logger.error(`TaskAgent failed to extract tasks: ${err.message}`);
    }
  }
}

module.exports = TaskAgent;
