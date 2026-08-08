class TaskRepository {
  constructor(container) {
    this.db = container.resolve('JsonDatabase');
    this.collection = 'tasks';
  }

  findAllPending() {
    const all = this.db.load(this.collection);
    return Object.values(all).filter(t => t.status === 'pending');
  }

  findAll() {
    return this.db.load(this.collection);
  }

  findById(id) {
    const all = this.db.load(this.collection);
    return all[id] || null;
  }

  save(task) {
    const all = this.db.load(this.collection);
    const id = task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const newTask = {
      status: 'pending',
      ...task,
      id,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    all[id] = newTask;
    this.db.save(this.collection, all);
    return newTask;
  }

  markCompleted(id) {
    const all = this.db.load(this.collection);
    if (all[id]) {
      all[id].status = 'completed';
      all[id].completedAt = new Date().toISOString();
      all[id].updatedAt = new Date().toISOString();
      this.db.save(this.collection, all);
      return all[id];
    }
    return null;
  }
}

module.exports = TaskRepository;
