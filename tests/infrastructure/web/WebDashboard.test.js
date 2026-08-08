const WebDashboard = require('../../../src/infrastructure/web/WebDashboard');
const express = require('express');

jest.mock('express', () => {
  const app = {
    use: jest.fn(),
  };
  const mockExpress = jest.fn(() => app);
  mockExpress.static = jest.fn();
  return mockExpress;
});

jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn()
  }))
}));

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn()
  }))
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('mock-qr-data')
}));

describe('WebDashboard', () => {
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
      })
    };
  });

  it('should subscribe to events on init', () => {
    const dashboard = new WebDashboard(mockContainer);
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('log', expect.any(Function));
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('whatsapp.qr', expect.any(Function));
    expect(mockEventBus.subscribe).toHaveBeenCalledWith('whatsapp.status', expect.any(Function));
  });

  it('should start server on start()', () => {
    const dashboard = new WebDashboard(mockContainer);
    dashboard.start();
    expect(dashboard.server.listen).toHaveBeenCalled();
  });
});
