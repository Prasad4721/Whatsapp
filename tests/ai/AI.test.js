const GroqAdapter = require('../../src/ai/GroqAdapter');
const AgentBase = require('../../src/ai/AgentBase');
const MasterAgent = require('../../src/ai/MasterAgent');
const axios = require('axios');

jest.mock('axios');

describe('AI Pipeline', () => {
  let mockContainer;
  let mockEventBus;
  let mockGroqAdapter;

  beforeEach(() => {
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };
    
    mockGroqAdapter = {
      generateCompletion: jest.fn()
    };

    mockContainer = {
      resolve: jest.fn((name) => {
        if (name === 'Logger') return { info: jest.fn(), error: jest.fn() };
        if (name === 'EventBus') return mockEventBus;
        if (name === 'Config') return { get: jest.fn() };
        if (name === 'GroqAdapter') return mockGroqAdapter;
        if (name === 'ContactRepository') return {};
      })
    };
  });

  describe('GroqAdapter', () => {
    it('should call axios with correct payload', async () => {
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: '{"action":"reply"}' } }] }
      });
      const adapter = new GroqAdapter(mockContainer);
      const res = await adapter.generateCompletion('sys', 'user', true);
      expect(res).toBe('{"action":"reply"}');
      expect(axios.post).toHaveBeenCalled();
    });
  });

  describe('AgentBase', () => {
    it('should throw on execute', async () => {
      const agent = new AgentBase(mockContainer, 'TestAgent');
      await expect(agent.execute('task')).rejects.toThrow();
    });

    it('should delegate askAI to groqAdapter', async () => {
      mockGroqAdapter.generateCompletion.mockResolvedValue('success');
      const agent = new AgentBase(mockContainer, 'TestAgent');
      const res = await agent.askAI('sys', 'user');
      expect(res).toBe('success');
    });
  });

  describe('MasterAgent', () => {
    it('should subscribe to message.received', () => {
      new MasterAgent(mockContainer);
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('message.received', expect.any(Function));
    });

    it('should ignore trivial messages without calling AI', async () => {
      const agent = new MasterAgent(mockContainer);
      await agent.processMessage({ from: '123', body: 'ok' });
      expect(mockGroqAdapter.generateCompletion).not.toHaveBeenCalled();
    });

    it('should publish message.send if AI decides to reply', async () => {
      mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({ action: 'reply', text: 'Hello' }));
      const agent = new MasterAgent(mockContainer);
      await agent.processMessage({ from: '123', body: 'complex question' });
      expect(mockEventBus.publish).toHaveBeenCalledWith('message.send', { to: '123', text: 'Hello' });
    });
    
    it('should not publish if AI decides to ignore', async () => {
      mockGroqAdapter.generateCompletion.mockResolvedValue(JSON.stringify({ action: 'ignore' }));
      const agent = new MasterAgent(mockContainer);
      await agent.processMessage({ from: '123', body: 'some spam' });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
