const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
  contacts: path.join(DATA_DIR, 'contacts.json'),
  conversations: path.join(DATA_DIR, 'conversations.json'), // rolling context per chat
  tasks: path.join(DATA_DIR, 'tasks.json'),
  reminders: path.join(DATA_DIR, 'reminders.json'),
  messages_log: path.join(DATA_DIR, 'messages_log.json'), // lightweight history for analytics
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function _load(file) {
  try {
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, 'utf-8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    logger.error(`Failed to read DB file ${file}: ${err.message}`);
    return {};
  }
}

function _save(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    logger.error(`Failed to write DB file ${file}: ${err.message}`);
  }
}

// ---------- Contacts ----------
function upsertContact(id, info) {
  const contacts = _load(FILES.contacts);
  contacts[id] = { ...(contacts[id] || {}), ...info, lastSeen: new Date().toISOString() };
  _save(FILES.contacts, contacts);
  return contacts[id];
}

function getContact(id) {
  const contacts = _load(FILES.contacts);
  return contacts[id] || null;
}

// ---------- Conversation rolling context (last N messages per chat) ----------
const MAX_CONTEXT_MESSAGES = 10;

function pushConversationContext(chatId, entry) {
  const conversations = _load(FILES.conversations);
  if (!conversations[chatId]) conversations[chatId] = [];
  conversations[chatId].push(entry);
  if (conversations[chatId].length > MAX_CONTEXT_MESSAGES) {
    conversations[chatId] = conversations[chatId].slice(-MAX_CONTEXT_MESSAGES);
  }
  _save(FILES.conversations, conversations);
}

function getConversationContext(chatId) {
  const conversations = _load(FILES.conversations);
  return conversations[chatId] || [];
}

// ---------- Tasks / Action Items ----------
function addTask(task) {
  const tasks = _load(FILES.tasks);
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  tasks[id] = {
    id,
    title: task.title,
    description: task.description || '',
    priority: task.priority || 'Medium',
    dueDate: task.dueDate || null,
    relatedContact: task.relatedContact || null,
    chatId: task.chatId || null,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  _save(FILES.tasks, tasks);
  return tasks[id];
}

function getPendingTasks() {
  const tasks = _load(FILES.tasks);
  return Object.values(tasks).filter((t) => t.status === 'pending');
}

function completeTask(id) {
  const tasks = _load(FILES.tasks);
  if (tasks[id]) {
    tasks[id].status = 'completed';
    tasks[id].completedAt = new Date().toISOString();
    _save(FILES.tasks, tasks);
    return tasks[id];
  }
  return null;
}

// ---------- Reminders ----------
function addReminder(reminder) {
  const reminders = _load(FILES.reminders);
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  reminders[id] = {
    id,
    reason: reminder.reason,
    dueAt: reminder.dueAt, // ISO string or null if unparsed
    priority: reminder.priority || 'Medium',
    sourceChatId: reminder.sourceChatId || null,
    createdAt: new Date().toISOString(),
    fired: false,
  };
  _save(FILES.reminders, reminders);
  return reminders[id];
}

function getDueReminders() {
  const reminders = _load(FILES.reminders);
  const now = Date.now();
  return Object.values(reminders).filter(
    (r) => !r.fired && r.dueAt && new Date(r.dueAt).getTime() <= now
  );
}

function markReminderFired(id) {
  const reminders = _load(FILES.reminders);
  if (reminders[id]) {
    reminders[id].fired = true;
    _save(FILES.reminders, reminders);
  }
}

function getAllReminders() {
  return Object.values(_load(FILES.reminders));
}

// ---------- Message log (for analytics; content-light) ----------
function logMessageMeta(entry) {
  const log = _load(FILES.messages_log);
  const dayKey = new Date().toISOString().slice(0, 10);
  if (!log[dayKey]) log[dayKey] = [];
  log[dayKey].push(entry);
  _save(FILES.messages_log, log);
}

function getMessageLogForRange(days = 7) {
  const log = _load(FILES.messages_log);
  const result = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (log[key]) result.push(...log[key]);
  }
  return result;
}

module.exports = {
  upsertContact,
  getContact,
  pushConversationContext,
  getConversationContext,
  addTask,
  getPendingTasks,
  completeTask,
  addReminder,
  getDueReminders,
  markReminderFired,
  getAllReminders,
  logMessageMeta,
  getMessageLogForRange,
};
