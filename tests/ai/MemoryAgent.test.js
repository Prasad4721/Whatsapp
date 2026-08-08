const MemoryAgent = require('../../src/ai/MemoryAgent');

describe('MemoryAgent', () => {
  let mockContainer;
  let mockEventBus;
  let mockGroqAdapter;
  let mockMemoryRepo;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    
    mockGroqAdapter = {
      generateCompletion: jest.fn()
    };

    mockMemoryRepo = {
      save: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'MemoryRepository') return mockMemoryRepo;
      })
    };
  });

  it('should subscribe to message.received', () => {
    new MemoryAgent(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.received', expect.any(Function));
  });

  it('should extract and save memories', async () => {
    mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({
      memories: ['Likes coffee', 'Has a dog']
    }));

    const agent = new MemoryAgent(mockContainer);
    await agent.extractMemories({ from: '123', body: 'I love coffee and walking my dog' });

    expect(mockMemoryRepo.save).toHaveBeenCalledTimes(2);
    expect(mockMemoryRepo.save).toHaveBeenCalledWith({ contactId: '123', content: 'Likes coffee' });
    expect(mockMemoryRepo.save).toHaveBeenCalledWith({ contactId: '123', content: 'Has a dog' });
  });

  it('should not save anything if no memories are found', async () => {
    mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({
      memories: []
    }));

    const agent = new MemoryAgent(mockContainer);
    await agent.extractMemories({ from: '123', body: 'going to the store' });

    expect(mockMemoryRepo.save).not.toHaveBeenCalled();
  });
});
