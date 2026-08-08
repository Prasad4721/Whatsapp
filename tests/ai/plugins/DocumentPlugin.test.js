const DocumentPlugin = require('../../../src/ai/plugins/DocumentPlugin');

describe('DocumentPlugin', () => {
  let mockContainer, mockEventBus, mockGroqAdapter, mockLogger;

  beforeEach(() => {
    mockEventBus = { subscribe: jest.fn(), publish: jest.fn() };
    mockGroqAdapter = { extractDocumentText: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'Logger') return mockLogger;
      })
    };
  });

  it('should process pdf and emit message.received', async () => {
    mockGroqAdapter.extractDocumentText.mockResolvedValue('Invoice Total: $100');
    
    const mockRawMessage = {
      downloadMedia: jest.fn().mockResolvedValue({
        mimetype: 'application/pdf',
        data: 'base64data'
      })
    };

    const plugin = new DocumentPlugin(mockContainer);
    await plugin.handleMedia({ rawMessage: mockRawMessage, from: '123' });

    expect(mockGroqAdapter.extractDocumentText).toHaveBeenCalledWith('base64data', 'application/pdf');
    expect(mockEventBus.publish).toHaveBeenCalledWith('message.received', expect.objectContaining({
      from: '123',
      body: expect.stringContaining('Invoice Total: $100')
    }));
  });
});
