const ReportAgent = require('../../src/ai/ReportAgent');

describe('ReportAgent', () => {
  let mockContainer, mockEventBus, mockTaskRepo, mockContactRepo, mockGroqAdapter, mockLogger;

  beforeEach(() => {
    mockEventBus = { subscribe: jest.fn(), publish: jest.fn() };
    mockTaskRepo = { findAll: jest.fn().mockReturnValue({}) };
    mockContactRepo = { findAll: jest.fn().mockReturnValue({}) };
    mockGroqAdapter = { generateCompletion: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'EventBus') return mockEventBus;
        if (name === 'TaskRepository') return mockTaskRepo;
        if (name === 'ContactRepository') return mockContactRepo;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'Logger') return mockLogger;
      })
    };
  });

  it('should subscribe to report.daily', () => {
    new ReportAgent(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('report.daily', expect.any(Function));
  });

  it('should generate a report and send it to the master phone', async () => {
    mockTaskRepo.findAll.mockReturnValue({
      '1': { status: 'pending', title: 'test task' }
    });
    mockGroqAdapter.generateCompletion.mockResolvedValue('Here is your daily report...');

    const agent = new ReportAgent(mockContainer);
    await agent.generateDailyReport('12345@c.us');

    expect(mockGroqAdapter.generateCompletion).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith('message.send', {
      to: '12345@c.us',
      text: 'Here is your daily report...'
    });
  });

  it('should generate a report and log it if no master phone provided', async () => {
    mockGroqAdapter.generateCompletion.mockResolvedValue('Here is your daily report...');

    const agent = new ReportAgent(mockContainer);
    await agent.generateDailyReport(null);

    expect(mockEventBus.publish).toHaveBeenCalledWith('log', expect.objectContaining({
      message: expect.stringContaining('Here is your daily report...')
    }));
  });
});
