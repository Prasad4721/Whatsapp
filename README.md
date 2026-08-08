# WhatsApp-PA: AI Executive Personal Assistant

Welcome to **WhatsApp-PA**, an autonomous, Event-Driven AI Executive Assistant that lives directly on WhatsApp, built for scale.

This project was completely transformed from a simple procedural bot into a **Clean Architecture Multi-Agent System**. It is designed to act as a highly competent Chief of Staff for executives, intelligently managing tasks, maintaining a lightweight CRM, scheduling reminders, and parsing multi-modal messages.

---

## 🚀 Features

- **Multi-Agent Architecture**: Discrete AI agents (`MasterAgent`, `MemoryAgent`, `ContactAgent`, `TaskAgent`, `ReportAgent`) collaborate via an asynchronous EventBus.
- **Glassmorphic Admin Dashboard**: A premium Web UI to monitor logs, scan the WhatsApp QR code, and manage system state.
- **Proactive Schedulers**: Cron-based scheduling engine that generates daily morning briefs, nightly follow-ups, and calendar digests.
- **Multi-Modal Hooks**: Native interceptors for Vision (Images), Voice Notes (Audio), and Documents (PDFs).
- **Zero-Friction Configurator**: Use `npm run setup` for an interactive CLI setup wizard.
- **Railway Cloud Ready**: Containerized with a robust `Dockerfile` optimized for headless Puppeteer.

---

## 🏗️ Architecture

The system enforces strict **Inversion of Control (IoC)** via a Dependency Injection Container. 

1. **`WhatsAppAdapter`**: Bridges `whatsapp-web.js` to the `EventBus`. It knows nothing about the AI.
2. **`EventBus`**: The central nervous system. Everything communicates by publishing and subscribing to events (`message.received`, `message.media`, `report.daily`).
3. **`GroqAdapter`**: Handles fast, cheap LLM inference using Llama 3 models.
4. **Agents**: Subscribe to the `EventBus`, mutate the local Repositories (`JsonDatabase`), and publish responses.

---

## 🛠️ Quick Start (Local)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Setup Wizard**
   ```bash
   npm run setup
   ```
   *This interactive CLI will configure your `.env` file and ask for your Groq API keys.*

3. **Start the Assistant**
   ```bash
   npm start
   ```

4. **Connect WhatsApp**
   - Open your browser to `http://localhost:<PORT>` (Default `8080`).
   - Scan the QR code using your WhatsApp (Linked Devices).

---

## ☁️ Deployment (Railway)

This repository is optimized for one-click deployment on [Railway](https://railway.app/). 

1. **Push to GitHub**: Make sure this codebase is in a GitHub repository.
2. **Create Railway Project**: Log into Railway, click **New Project** -> **Deploy from GitHub repo**.
3. **Select Repo**: Choose your repository.
4. **Environment Variables**: Add your `.env` variables to Railway (e.g., `GROQ_API_KEY`, `MASTER_PHONE`, `PORT`).
5. **Deploy**: Railway will automatically detect the `Dockerfile` and build the container with all required Chromium dependencies!

*Note: Once deployed, navigate to the Railway-generated URL to access the Admin Dashboard and scan the QR code.*

---

## 📚 Roadmap (Completed)

This project was built across 15 structured modules:

- [x] Phase 1: Architectural Audit & Planning
- [x] Phase 2: Repository Pattern & Storage Re-write
- [x] Phase 3: Adapter Decoupling (WhatsApp & HTTP)
- [x] Phase 4: Foundational Agent Framework
- [x] Phase 5: Parallel Memory Engine
- [x] Phase 6: Autonomous CRM Plugin
- [x] Phase 7: Smart Task Extractor
- [x] Phase 8: Chrono & Node-Cron Schedulers
- [x] Phase 9: Unified Bootstrapper (DI Container)
- [x] Phase 10: Monolith Cleanup
- [x] Phase 11: CLI Configurator (`pa-setup.js`)
- [x] Phase 12: Premium Glassmorphic UI Refactor
- [x] Phase 13: Daily Reporting Engines
- [x] Phase 14: Vision, Voice, and Document Plugin Hooks
- [x] Phase 15: Documentation & Cloud Deployment

---

*Built with Node.js, Express, Socket.IO, whatsapp-web.js, and Groq.*
