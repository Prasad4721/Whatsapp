const fs = require('fs');
const path = require('path');

class JsonDatabase {
  constructor(container) {
    this.logger = container.resolve('Logger');
    this.dataDir = path.join(process.cwd(), 'data'); // Root data folder
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  load(collection) {
    const file = path.join(this.dataDir, `${collection}.json`);
    try {
      if (!fs.existsSync(file)) return {};
      const raw = fs.readFileSync(file, 'utf-8').trim();
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      this.logger.error(`Failed to read DB collection ${collection}: ${err.message}`);
      return {};
    }
  }

  save(collection, data) {
    const file = path.join(this.dataDir, `${collection}.json`);
    try {
      // Synchronous write avoids race conditions in a single-threaded Node process 
      // without needing complex lock management for simple JSON.
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to write DB collection ${collection}: ${err.message}`);
    }
  }
}

module.exports = JsonDatabase;
