const ContactAgent = require('../../src/ai/ContactAgent');

describe('ContactAgent', () => {
  let mockContainer;
  let mockEventBus;
  let mockGroqAdapter;
  let mockContactRepo;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    
    mockGroqAdapter = {
      generateCompletion: jest.fn()
    };

    mockContactRepo = {
      findById: jest.fn(),
      upsert: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'ContactRepository') return mockContactRepo;
      })
    };
  });

  it('should subscribe to message.received', () => {
    new ContactAgent(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.received', expect.any(Function));
  });

  it('should update lastSeen and extract name/relationship', async () => {
    mockContactRepo.findById.mockReturnValue({});
    mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({
      name: 'John Doe',
      relationship: 'Client'
    }));

    const agent = new ContactAgent(mockContainer);
    await agent.analyzeContact({ from: '123', body: 'Hi, this is John Doe, attached is the invoice.' });

    expect(mockContactRepo.upsert).toHaveBeenCalledWith('123', expect.objectContaining({
      name: 'John Doe',
      relationship: 'Client',
      lastSeen: expect.any(String)
    }));
  });

  it('should just update lastSeen for trivial messages', async () => {
    const agent = new ContactAgent(mockContainer);
    await agent.analyzeContact({ from: '123', body: 'ok' });

    expect(mockGroqAdapter.generateCompletion).not.toHaveBeenCalled();
    expect(mockContactRepo.upsert).toHaveBeenCalledWith('123', expect.objectContaining({
      lastSeen: expect.any(String)
    }));
  });
});
