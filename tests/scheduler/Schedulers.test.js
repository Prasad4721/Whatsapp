const ReminderScheduler = require('../../src/scheduler/ReminderScheduler');
const FollowUpScheduler = require('../../src/scheduler/FollowUpScheduler');

// Mock cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((cronStr, cb) => {
    return { stop: jest.fn() }; // return a mock task
  })
}));

describe('Schedulers', () => {
  let mockContainer;
  let mockEventBus;
  let mockTaskRepo;
  let mockContactRepo;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn()
    };
    
    mockTaskRepo = {
      findAll: jest.fn(),
      markCompleted: jest.fn()
    };

    mockContactRepo = {
      findAll: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'TaskRepository') return mockTaskRepo;
        if (name === 'ContactRepository') return mockContactRepo;
      })
    };
  });

  describe('ReminderScheduler', () => {
    it('should check for due tasks and send messages', () => {
      mockTaskRepo.findAll.mockReturnValue({
        'task1': { id: 'task1', status: 'pending', title: 'Buy milk', dueDate: new Date(Date.now() - 10000).toISOString(), contactId: '123' },
        'task2': { id: 'task2', status: 'pending', title: 'Future task', dueDate: new Date(Date.now() + 100000).toISOString(), contactId: '123' },
      });

      const scheduler = new ReminderScheduler(mockContainer);
      scheduler.checkReminders();

      expect(mockEventBus.publish).toHaveBeenCalledWith('message.send', expect.objectContaining({
        text: expect.stringContaining('Buy milk')
      }));
      expect(mockTaskRepo.markCompleted).toHaveBeenCalledWith('task1');
      expect(mockTaskRepo.markCompleted).not.toHaveBeenCalledWith('task2');
    });
  });

  describe('FollowUpScheduler', () => {
    it('should notify for VIPs unseen for 7 days', () => {
      mockContactRepo.findAll.mockReturnValue({
        '123': { name: 'VIP Client', relationship: 'VIP', lastSeen: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
        '456': { name: 'Recent Client', relationship: 'Client', lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      });

      const scheduler = new FollowUpScheduler(mockContainer);
      scheduler.checkFollowUps();

      expect(mockEventBus.publish).toHaveBeenCalledWith('log', expect.objectContaining({
        message: expect.stringContaining('Action Required')
      }));
    });
  });
});
