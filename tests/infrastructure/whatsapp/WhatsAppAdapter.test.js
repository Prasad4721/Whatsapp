const WhatsAppAdapter = require('../../../src/infrastructure/whatsapp/WhatsAppAdapter');
const { Client, LocalAuth } = require('whatsapp-web.js');

jest.mock('whatsapp-web.js', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      initialize: jest.fn(),
      destroy: jest.fn(),
      sendMessage: jest.fn()
    })),
    LocalAuth: jest.fn()
  };
});

describe('WhatsAppAdapter', () => {
  let mockContainer;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'Config') return {};
      })
    };
  });

  it('should initialize client on start()', () => {
    const adapter = new WhatsAppAdapter(mockContainer);
    adapter.start();
    expect(adapter.client.initialize).toHaveBeenCalled();
  });

  it('should subscribe to message.send events', () => {
    const adapter = new WhatsAppAdapter(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.send', expect.any(Function));
  });
});
