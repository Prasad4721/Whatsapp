# PA — WhatsApp AI Executive Assistant (Backend, Terminal Only)

A Node.js backend that connects to your real WhatsApp account (via WhatsApp Web),
analyzes incoming messages with Groq's LLM API, and prints structured,
formatted results directly in your terminal — priority, summary, action items,
reminders, tone-matched reply suggestions, and a notify/silent decision.

No UI. No database server. Just a terminal process and JSON files on disk.

---

## 1. Requirements

- Node.js 18+
- A WhatsApp account on your phone (to scan the QR code)
- A free Groq API key: https://console.groq.com/keys

## 2. Install

```bash
cd whatsapp-pa
npm install
```

> Note: `whatsapp-web.js` depends on Puppeteer, which downloads a bundled
> Chromium on install. That step needs internet access and may take a few minutes.

## 3. Configure

```bash
cp .env.example .env
```

Open `.env` and set:

```
GROQ_API_KEY=your_real_key_here
```

Adjust the other settings if you want (notify threshold, cron schedules,
whether to ignore group chats, etc). Defaults are sensible.

## 4. Run

```bash
npm start
```

- The first time, a QR code will print in your terminal.
- Open WhatsApp on your phone → **Settings → Linked Devices → Link a Device** → scan it.
- Your session is saved to `.wwebjs_auth/` so you won't need to re-scan on future runs.
- Once you see `✅ PA IS ONLINE`, incoming messages will be analyzed live.

Stop it any time with `Ctrl+C` — it shuts down the WhatsApp session cleanly.

## 5. What you'll see

Every incoming message you receive gets a block like:

```
════════════════════════════════════════════════════════
PA · Rahul Sharma
"Can you send the report before 6 PM today? Client is waiting."
────────────────────────────────────────────────────────
Priority:  High  (85/100)
Category: Office   Sentiment: Urgent

Summary: Rahul needs the report sent before 6 PM; client is waiting.

Action Items:
  ☐ Send the report [High] · due: 7/3/2026, 6:00:00 PM

Suggested Reminder(s):
  ⏰ Follow up if report isn't sent by 5:30 PM (7/3/2026, 5:30:00 PM)

Suggested Replies:
  1. On it, will send by 6.
  2. Sure, sending it over shortly!
  3. Got it.

Notification:  NOTIFY  — Time-sensitive request from a work contact.
Confidence: 91%
════════════════════════════════════════════════════════
```

Trivial messages ("ok", "haha", "good morning") are handled locally with
no API call and no notification — they're logged quietly and skipped.

Scheduled automatically:
- **Daily brief** — pending tasks + upcoming reminders (default 8:00 AM)
- **Evening report** — what got processed/notified today (default 9:00 PM)
- **Weekly analytics** — message volume by category/contact (default Sunday 9:00 AM)
- **Reminder watcher** — checks every minute for anything due, alerts in terminal

## 6. Where things are stored

| Path | What |
|---|---|
| `data/contacts.json` | Known contacts + relationship labels |
| `data/conversations.json` | Rolling last-10-message context per chat (for tone matching) |
| `data/tasks.json` | Extracted action items |
| `data/reminders.json` | Extracted reminders |
| `data/messages_log.json` | Lightweight metadata log for analytics (category/priority/notified — not full message content) |
| `logs/pa.log` | Full structured logs (JSON lines) |
| `logs/errors.log` | Errors only |
| `.wwebjs_auth/` | Your WhatsApp session — treat like a password, never share or commit it |

## 7. Safety behavior built in

- **OTPs / verification codes are never displayed, logged, or sent to the AI.** They're detected locally and suppressed before analysis even happens.
- **Suspected phishing/financial-fraud patterns** (urgent link + request for credentials/payment) are flagged and force a notification rather than being acted on.
- **PA never sends any message on your behalf.** It only ever prints *suggestions* — sending is always your decision, done by you in WhatsApp.
- **No fabricated deadlines.** If the AI can't confidently extract a date, it's left null rather than guessed.

## 8. Extending it

- `src/ai/prompt.js` — the system prompt driving all analysis. Edit categories, tone rules, or the JSON schema here.
- `src/ai/analyzer.js` — local triage rules (what skips the API entirely) and security pre-filters.
- `src/utils/formatter.js` — terminal output styling.
- `src/services/scheduler.js` — cron jobs for daily/evening/weekly reports.

## 9. Troubleshooting

- **QR code won't scan / times out** — restart with `npm start`, make sure your phone has internet.
- **"GROQ_API_KEY is missing"** — check `.env` exists and is filled in (not `.env.example`).
- **Puppeteer/Chromium errors on Linux servers** — you may need `sudo apt install -y libgbm-dev` or similar system libraries; check the whatsapp-web.js docs for your OS.
- **Session keeps logging out** — don't delete `.wwebjs_auth/` between runs, and avoid running two instances with the same session at once.
