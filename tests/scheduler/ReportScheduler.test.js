const ReportScheduler = require('../../src/scheduler/ReportScheduler');

jest.mock('node-cron', () => ({
  schedule: jest.fn((cronStr, cb) => {
    return { stop: jest.fn() }; 
  })
}));

describe('ReportScheduler', () => {
  let mockContainer, mockEventBus, mockConfig, mockLogger;

  beforeEach(() => {
    mockEventBus = { publish: jest.fn() };
    mockConfig = { schedule: { dailyBrief: '* * * * *' } };
    mockLogger = { info: jest.fn() };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'EventBus') return mockEventBus;
        if (name === 'Config') return mockConfig;
        if (name === 'Logger') return mockLogger;
      })
    };
  });

  it('should schedule daily report', () => {
    const scheduler = new ReportScheduler(mockContainer);
    scheduler.start();
    
    // Simulating cron tick
    const cronMock = require('node-cron').schedule;
    const taskCb = cronMock.mock.calls[cronMock.mock.calls.length - 1][1];
    
    taskCb();
    
    expect(mockEventBus.publish).toHaveBeenCalledWith('report.daily', expect.any(Object));
  });
});
