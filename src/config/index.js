require('dotenv').config();

class Config {
  constructor() {
    const requireEnv = (name, fallback = undefined) => process.env[name] ?? fallback;
    
    this.groq = {
      apiKey: requireEnv('GROQ_API_KEY'),
      model: requireEnv('GROQ_MODEL', 'llama-3.3-70b-versatile'),
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    };
    this.behavior = {
      triageMinLength: parseInt(requireEnv('TRIAGE_MIN_LENGTH', '12'), 10),
      notifyThreshold: parseInt(requireEnv('NOTIFY_THRESHOLD', '60'), 10),
      autoReplyEnabled: requireEnv('AUTO_REPLY_ENABLED', 'false') === 'true',
    };
    this.schedule = {
      dailyBrief: requireEnv('DAILY_BRIEF_CRON', '0 8 * * *'),
      eveningReport: requireEnv('EVENING_REPORT_CRON', '0 21 * * *'),
      weeklyAnalytics: requireEnv('WEEKLY_ANALYTICS_CRON', '0 9 * * 0'),
    };
    this.whatsapp = {
      ignoreGroups: requireEnv('IGNORE_GROUPS', 'false') === 'true',
      ignoreStatus: requireEnv('IGNORE_STATUS', 'true') === 'true',
    };
    this.logging = {
      level: requireEnv('LOG_LEVEL', 'info'),
      dir: requireEnv('LOG_DIR', './logs'),
    };
  }

  validate(logger) {
    const problems = [];
    if (!this.groq.apiKey || this.groq.apiKey === 'your_groq_api_key_here') {
      problems.push('GROQ_API_KEY is missing. Set it in your .env file.');
    }
    if (problems.length && logger) {
      problems.forEach((p) => logger.error(p));
      logger.error('Fix the above and restart. Exiting.');
      process.exit(1);
    }
  }
}

module.exports = Config;
