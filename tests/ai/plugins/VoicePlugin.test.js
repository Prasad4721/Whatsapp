const VoicePlugin = require('../../../src/ai/plugins/VoicePlugin');

describe('VoicePlugin', () => {
  let mockContainer, mockEventBus, mockGroqAdapter, mockLogger;

  beforeEach(() => {
    mockEventBus = { subscribe: jest.fn(), publish: jest.fn() };
    mockGroqAdapter = { transcribeAudio: jest.fn() };
    mockLogger = { info: jest.fn(), error: jest.fn() };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'EventBus') return mockEventBus;
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'Logger') return mockLogger;
      })
    };
  });

  it('should process audio and emit message.received', async () => {
    mockGroqAdapter.transcribeAudio.mockResolvedValue('Hello there');
    
    const mockRawMessage = {
      downloadMedia: jest.fn().mockResolvedValue({
        mimetype: 'audio/ogg',
        data: 'base64data'
      })
    };

    const plugin = new VoicePlugin(mockContainer);
    await plugin.handleMedia({ rawMessage: mockRawMessage, from: '123' });

    expect(mockGroqAdapter.transcribeAudio).toHaveBeenCalledWith('base64data', 'audio/ogg');
    expect(mockEventBus.publish).toHaveBeenCalledWith('message.received', expect.objectContaining({
      from: '123',
      body: expect.stringContaining('Hello there')
    }));
  });
});
