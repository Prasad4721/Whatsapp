class MemoryRepository {
  constructor(container) {
    this.db = container.resolve('JsonDatabase');
    this.collection = 'memories';
  }

  findAllByContact(contactId) {
    const all = this.db.load(this.collection);
    return Object.values(all).filter(m => m.contactId === contactId);
  }

  findById(id) {
    const all = this.db.load(this.collection);
    return all[id] || null;
  }

  save(memory) {
    const all = this.db.load(this.collection);
    const id = memory.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const newMemory = { 
      ...memory, 
      id, 
      createdAt: memory.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    };
    
    all[id] = newMemory;
    this.db.save(this.collection, all);
    return newMemory;
  }

  delete(id) {
    const all = this.db.load(this.collection);
    if (all[id]) {
      delete all[id];
      this.db.save(this.collection, all);
      return true;
    }
    return false;
  }

  /**
   * Stub for Phase 11 Semantic Vector Memory
   */
  async searchSemantic(query, limit = 5) {
    // To be implemented using Embeddings/VectorDB plugin
    // Currently returns empty array
    return [];
  }
}

module.exports = MemoryRepository;
