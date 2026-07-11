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

  if (analysis.business_context) {
    const bc = analysis.business_context;
    const parts = [];
    if (bc.relationship_type && bc.relationship_type !== 'Unknown') parts.push(`Rel: ${bc.relationship_type}`);
    if (bc.client_tier && bc.client_tier !== 'Unknown' && bc.client_tier !== 'Not Applicable') parts.push(`Tier: ${bc.client_tier}`);
    if (bc.deal_stage && bc.deal_stage !== 'Unknown' && bc.deal_stage !== 'Not Applicable') parts.push(`Stage: ${bc.deal_stage}`);
    if (bc.churn_or_complaint_risk && bc.churn_or_complaint_risk !== 'None') parts.push(chalk.red(`Risk: ${bc.churn_or_complaint_risk}`));
    if (bc.revenue_mentioned && bc.revenue_mentioned.amount) {
      parts.push(`Revenue: ${bc.revenue_mentioned.amount} ${bc.revenue_mentioned.currency || ''} (${bc.revenue_mentioned.context || ''})`);
    }
    if (bc.competitor_mentioned) parts.push(`Competitor: ${bc.competitor_mentioned}`);
    if (bc.upsell_or_opportunity_signal) parts.push(`Upsell: ${bc.upsell_or_opportunity_signal}`);
    
    if (parts.length > 0) {
      out.push('');
      out.push(chalk.bold('Business Context:'));
      parts.forEach(p => out.push(`  • ${p}`));
    }
  }

  if (analysis.sla_or_contract_deadline && analysis.sla_or_contract_deadline.detected) {
    const sla = analysis.sla_or_contract_deadline;
    out.push('');
    out.push(chalk.bgRed.white.bold(' ⚠ SLA/DEADLINE DETECTED '));
    out.push(`  • ${sla.description} (Due: ${sla.due_date_text || 'Unknown'})`);
  }

  if (analysis.escalation && analysis.escalation.required) {
    const esc = analysis.escalation;
    out.push('');
    out.push(chalk.bgRed.white.bold(' ⚠ ESCALATION REQUIRED '));
    out.push(`  • Reason: ${esc.reason}`);
    out.push(`  • Route to: ${esc.suggested_recipient || 'Team'}`);
  }

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
