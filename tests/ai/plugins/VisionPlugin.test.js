const VisionPlugin = require('../../../src/ai/plugins/VisionPlugin');

describe('VisionPlugin', () => {
  let mockContainer, mockEventBus, mockGroqAdapter, mockLogger;

  beforeEach(() => {
    mockEventBus = { subscribe: jest.fn(), publish: jest.fn() };
    mockGroqAdapter = { analyzeImage: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'Logger') return mockLogger;
      })
    };
  });

  it('should subscribe to message.media', () => {
    new VisionPlugin(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.media', expect.any(Function));
  });

  it('should process image and emit message.received', async () => {
    mockGroqAdapter.analyzeImage.mockResolvedValue('A picture of a dog');
    
    const mockRawMessage = {
      downloadMedia: jest.fn().mockResolvedValue({
        mimetype: 'image/jpeg',
        data: 'base64data'
      })
    };

    const plugin = new VisionPlugin(mockContainer);
    await plugin.handleMedia({ rawMessage: mockRawMessage, from: '123' });

    expect(mockGroqAdapter.analyzeImage).toHaveBeenCalledWith('base64data', 'image/jpeg');
    expect(mockEventBus.publish).toHaveBeenCalledWith('message.received', expect.objectContaining({
      from: '123',
      body: expect.stringContaining('A picture of a dog')
    }));
  });

  it('should ignore non-image media', async () => {
    const mockRawMessage = {
      downloadMedia: jest.fn().mockResolvedValue({
        mimetype: 'audio/ogg'
      })
    };

    const plugin = new VisionPlugin(mockContainer);
    await plugin.handleMedia({ rawMessage: mockRawMessage, from: '123' });

    expect(mockGroqAdapter.analyzeImage).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });
});
