class ContactRepository {
  constructor(container) {
    this.db = container.resolve('JsonDatabase');
    this.collection = 'contacts';
  }

  findById(id) {
    const all = this.db.load(this.collection);
    return all[id] || null;
  }

  upsert(id, contactData) {
    const all = this.db.load(this.collection);
    const existing = all[id] || {};
    
    // Merge existing data with new data
    const updated = {
      ...existing,
      ...contactData,
      id,
      lastSeen: new Date().toISOString()
    };
    
    all[id] = updated;
    this.db.save(this.collection, all);
    return updated;
  }

  findAll() {
    return Object.values(this.db.load(this.collection));
  }
}

module.exports = ContactRepository;
