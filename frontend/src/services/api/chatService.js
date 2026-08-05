import apiClient from './apiClient';

export const chatService = {
  // Sessions
  getSessions: async () => {
    const res = await apiClient.get('/ai/chat/sessions');
    return res.data;
  },
  createSession: async (mode = 'general', contextId = null, contextLabel = null) => {
    const res = await apiClient.post('/ai/chat/sessions', { mode, context_id: contextId, context_label: contextLabel });
    return res.data;
  },
  deleteSession: async (sessionId) => {
    await apiClient.delete(`/ai/chat/sessions/${sessionId}`);
  },

  // Messages
  getMessages: async (sessionId) => {
    const res = await apiClient.get(`/ai/chat/sessions/${sessionId}/messages`);
    return res.data;
  },

  // Streaming send — returns a native EventSource-compatible fetch stream
  sendMessage: async (sessionId, message, onDelta, onDone) => {
    const baseURL = apiClient.defaults.baseURL || '';
    const token = localStorage.getItem('jwt_token');
    const response = await fetch(`${baseURL}/ai/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) onDelta(data.delta);
            if (data.done) onDone(data.full);
          } catch { /* ignore */ }
        }
      }
    }
  },
};
