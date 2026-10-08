import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const SUGGESTIONS = [
  'What should I study today?',
  'How do I add a task?',
  'How many hours should I put for a programming assignment?',
  "Can I study today's sessions tomorrow instead?",
];
function ChatAssistant({ userId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  // Keep the chat scrolled to the newest message
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const next = [...messages, { role: 'user', text: clean }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        userId,
        messages: next.filter((m) => !m.error),
      });
      setMessages([...next, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      setMessages([
        ...next,
        { role: 'assistant', text: 'Sorry, I could not answer right now. Please try again.', error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="db-panel db-chat">
      <div className="db-panel-head">
        <h2 className="db-section-title">Study assistant</h2>
        {messages.length > 0 && (
          <button className="db-btn db-btn-small" onClick={() => setMessages([])} disabled={loading}>
            New chat
          </button>
        )}
      </div>

      <div className="db-chat-log" ref={logRef}>
        {messages.length === 0 && (
          <div className="db-chat-empty">
            <p>Ask me anything about your tasks, exams and schedule.</p>
            <div className="db-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="db-suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} dir="auto" className={`db-msg ${m.role} ${m.error ? 'error' : ''}`}>
            {m.text}
          </div>
        ))}

        {loading && <div className="db-msg assistant db-msg-typing">Thinking…</div>}
      </div>

      <form className="db-chat-form" onSubmit={handleSubmit}>
        <input
          className="db-input"
          type="text"
          dir="auto"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
        />
        <button type="submit" className="db-btn db-btn-primary" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatAssistant;