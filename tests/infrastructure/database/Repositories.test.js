const fs = require('fs');
const path = require('path');
const JsonDatabase = require('../../../src/infrastructure/database/JsonDatabase');
const ContactRepository = require('../../../src/infrastructure/database/repositories/ContactRepository');
const MemoryRepository = require('../../../src/infrastructure/database/repositories/MemoryRepository');
const TaskRepository = require('../../../src/infrastructure/database/repositories/TaskRepository');

// Mock fs to avoid actually writing to disk during tests
jest.mock('fs');

describe('Repositories', () => {
  let mockContainer;
  let jsonDb;

  beforeEach(() => {
    // Reset mocks
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('{}');
    fs.writeFileSync.mockClear();

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { error: jest.fn(), info: jest.fn() };
        if (name === 'JsonDatabase') return jsonDb;
      })
    };

    jsonDb = new JsonDatabase(mockContainer);
  });

  describe('ContactRepository', () => {
    it('should upsert a contact', () => {
      const repo = new ContactRepository(mockContainer);
      const contact = repo.upsert('123@c.us', { name: 'John', relationship: 'Friend' });
      
      expect(contact.id).toBe('123@c.us');
      expect(contact.name).toBe('John');
      expect(contact.lastSeen).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('MemoryRepository', () => {
    it('should save a memory and generate an ID if missing', () => {
      const repo = new MemoryRepository(mockContainer);
      const mem = repo.save({ contactId: '123@c.us', content: 'Likes coffee' });
      
      expect(mem.id).toBeDefined();
      expect(mem.content).toBe('Likes coffee');
      expect(mem.createdAt).toBeDefined();
    });
  });

  describe('TaskRepository', () => {
    it('should save a task as pending by default', () => {
      const repo = new TaskRepository(mockContainer);
      const task = repo.save({ title: 'Buy milk' });
      
      expect(task.status).toBe('pending');
      expect(task.title).toBe('Buy milk');
    });

    it('should mark a task as completed', () => {
      fs.readFileSync.mockReturnValue(JSON.stringify({
        'task_1': { id: 'task_1', status: 'pending', title: 'Buy milk' }
      }));
      
      const repo = new TaskRepository(mockContainer);
      const completed = repo.markCompleted('task_1');
      
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });
  });
});
