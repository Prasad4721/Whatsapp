const cron = require('node-cron');
const chalk = require('chalk');
const logger = require('../logger');
const db = require('../db');
const { config } = require('../config');
const { formatBanner, line } = require('../utils/formatter');

// Checks for due reminders every minute and alerts in the terminal.
function startReminderWatcher() {
  cron.schedule('* * * * *', () => {
    const due = db.getDueReminders();
    due.forEach((r) => {
      console.log(formatBanner('⏰ REMINDER DUE'));
      console.log(`${chalk.bold(r.reason)}`);
      console.log(chalk.dim(`Was due: ${new Date(r.dueAt).toLocaleString()}`));
      console.log(line());
      logger.info(`Reminder fired: ${r.reason}`, { id: r.id });
      db.markReminderFired(r.id);
    });
  });
  logger.info('Reminder watcher started (checks every minute).');
}

function startDailyBrief() {
  cron.schedule(config.schedule.dailyBrief, () => {
    const tasks = db.getPendingTasks();
    const reminders = db.getAllReminders().filter((r) => !r.fired);

    console.log(formatBanner('☀️  DAILY EXECUTIVE BRIEF'));
    console.log(chalk.bold(`Pending tasks: ${tasks.length}`));
    tasks.slice(0, 10).forEach((t) => console.log(`  ☐ ${t.title} ${chalk.dim(`[${t.priority}]`)}`));

    console.log('');
    console.log(chalk.bold(`Upcoming reminders: ${reminders.length}`));
    reminders.slice(0, 10).forEach((r) =>
      console.log(`  ⏰ ${r.reason} ${chalk.dim(r.dueAt ? `(${new Date(r.dueAt).toLocaleString()})` : '(time unspecified)')}`)
    );
    console.log(line('═'));

    logger.info('Daily brief generated', { pendingTasks: tasks.length, pendingReminders: reminders.length });
  });
  logger.info(`Daily brief scheduled: ${config.schedule.dailyBrief}`);
}

function startEveningReport() {
  cron.schedule(config.schedule.eveningReport, () => {
    const allTasks = Object.values(db.getPendingTasks());
    const completedToday = []; // Completed tasks aren't queried separately here; extend db.js if needed.
    const todayLog = db.getMessageLogForRange(1);
    const notifiedToday = todayLog.filter((m) => m.notified).length;

    console.log(formatBanner('🌙 EVENING REPORT'));
    console.log(chalk.bold(`Messages processed today: ${todayLog.length}`));
    console.log(chalk.bold(`Important notifications sent: ${notifiedToday}`));
    console.log(chalk.bold(`Still pending: ${allTasks.length} task(s)`));
    console.log(line('═'));

    logger.info('Evening report generated', { messagesProcessed: todayLog.length, notified: notifiedToday });
  });
  logger.info(`Evening report scheduled: ${config.schedule.eveningReport}`);
}

function startWeeklyAnalytics() {
  cron.schedule(config.schedule.weeklyAnalytics, () => {
    const weekLog = db.getMessageLogForRange(7);
    const byCategory = {};
    const byContact = {};
    let notifiedCount = 0;

    weekLog.forEach((m) => {
      byCategory[m.category] = (byCategory[m.category] || 0) + 1;
      byContact[m.senderName] = (byContact[m.senderName] || 0) + 1;
      if (m.notified) notifiedCount += 1;
    });

    console.log(formatBanner('📊 WEEKLY ANALYTICS'));
    console.log(chalk.bold(`Total messages analyzed: ${weekLog.length}`));
    console.log(chalk.bold(`Notifications sent: ${notifiedCount}`));

    console.log('');
    console.log(chalk.bold('By category:'));
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));

    console.log('');
    console.log(chalk.bold('Most contacted:'));
    Object.entries(byContact)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([name, count]) => console.log(`  ${name}: ${count} message(s)`));

    console.log(line('═'));

    logger.info('Weekly analytics generated', { totalMessages: weekLog.length, notifiedCount });
  });
  logger.info(`Weekly analytics scheduled: ${config.schedule.weeklyAnalytics}`);
}

function startAllSchedulers() {
  startReminderWatcher();
  startDailyBrief();
  startEveningReport();
  startWeeklyAnalytics();
}

module.exports = { startAllSchedulers };
