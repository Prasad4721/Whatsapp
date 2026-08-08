const TaskAgent = require('../../src/ai/TaskAgent');

describe('TaskAgent', () => {
  let mockContainer;
  let mockEventBus;
  let mockGroqAdapter;
  let mockTaskRepo;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    
    mockGroqAdapter = {
      generateCompletion: jest.fn()
    };

    mockTaskRepo = {
      save: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'TaskRepository') return mockTaskRepo;
      })
    };
  });

  it('should subscribe to message.received', () => {
    new TaskAgent(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.received', expect.any(Function));
  });

  it('should extract and save tasks', async () => {
    mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({
      tasks: [
        { title: 'Call John', dueDate: '2026-08-09T10:00:00Z' }
      ]
    }));

    const agent = new TaskAgent(mockContainer);
    await agent.extractTasks({ from: '123', body: 'remind me to call John tomorrow' });

    expect(mockTaskRepo.save).toHaveBeenCalledTimes(1);
    expect(mockTaskRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Call John',
      dueDate: '2026-08-09T10:00:00Z',
      contactId: '123'
    }));
  });

  it('should not save anything if no tasks are found', async () => {
    mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({
      tasks: []
    }));

    const agent = new TaskAgent(mockContainer);
    await agent.extractTasks({ from: '123', body: 'just going for a walk' });

    expect(mockTaskRepo.save).not.toHaveBeenCalled();
  });
});
