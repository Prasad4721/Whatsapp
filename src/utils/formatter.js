const chalk = require('chalk');

const PRIORITY_COLORS = {
  Critical: chalk.bgRed.white.bold,
  High: chalk.red.bold,
  Medium: chalk.yellow.bold,
  Low: chalk.gray,
  Ignore: chalk.dim,
  Unknown: chalk.magenta,
};

function line(char = '─', len = 60) {
  return chalk.dim(char.repeat(len));
}

function formatAnalysis({ senderName, chatId, isGroup, messageText }, analysis) {
  const color = PRIORITY_COLORS[analysis.priority] || chalk.white;
  const out = [];

  out.push('');
  out.push(line('═'));
  out.push(
    `${chalk.bold.cyan('PA')} ${chalk.dim('·')} ${chalk.bold(senderName || chatId)} ${
      isGroup ? chalk.dim('(group)') : ''
    }`
  );
  out.push(chalk.dim(`"${truncate(messageText, 100)}"`));
  out.push(line());

  out.push(`${chalk.bold('Priority:')} ${color(` ${analysis.priority} `)} ${chalk.dim(`(${analysis.priority_score}/100)`)}`);
  out.push(`${chalk.bold('Category:')} ${analysis.category}   ${chalk.bold('Sentiment:')} ${analysis.sentiment}`);

  if (analysis.security_flag && analysis.security_flag !== 'none') {
    out.push(chalk.bgYellow.black.bold(` ⚠ SECURITY: ${analysis.security_flag} `));
  }

  out.push('');
  out.push(`${chalk.bold('Summary:')} ${analysis.summary}`);

  if (analysis.key_points && analysis.key_points.length) {
    out.push('');
    out.push(chalk.bold('Key Points:'));
    analysis.key_points.forEach((k) => out.push(`  • ${k}`));
  }

  if (analysis.action_items && analysis.action_items.length) {
    out.push('');
    out.push(chalk.bold('Action Items:'));
    analysis.action_items.forEach((a) => {
      const due = a.due_date_iso ? new Date(a.due_date_iso).toLocaleString() : a.due_date_text || 'No deadline';
      out.push(`  ☐ ${a.title} ${chalk.dim(`[${a.priority || 'Medium'}] · due: ${due}`)}`);
    });
  }

  if (analysis.reminders && analysis.reminders.length) {
    out.push('');
    out.push(chalk.bold('Suggested Reminder(s):'));
    analysis.reminders.forEach((r) => {
      const due = r.due_date_iso ? new Date(r.due_date_iso).toLocaleString() : r.due_date_text || 'unspecified time';
      out.push(`  ⏰ ${r.reason} ${chalk.dim(`(${due})`)}`);
    });
  }

  if (analysis.reply_suggestions && analysis.reply_suggestions.length) {
    out.push('');
    out.push(chalk.bold('Suggested Replies:'));
    analysis.reply_suggestions.forEach((r, i) => out.push(`  ${i + 1}. ${r}`));
  }

  out.push('');
  const notifyLabel = analysis.notify_user ? chalk.bgGreen.black.bold(' NOTIFY ') : chalk.bgGray.black(' SILENT ');
  out.push(`${chalk.bold('Notification:')} ${notifyLabel} ${chalk.dim(`— ${analysis.notify_reason || ''}`)}`);
  out.push(`${chalk.bold('Confidence:')} ${analysis.confidence}%`);
  out.push(line('═'));

  return out.join('\n');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatBanner(text) {
  return `\n${chalk.bold.bgBlue.white(`  ${text}  `)}\n`;
}

module.exports = { formatAnalysis, formatBanner, line };
