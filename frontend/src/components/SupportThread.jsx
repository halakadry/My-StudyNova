import { useState } from 'react';
import { useLanguage } from '../i18n/useLanguage';

export const CATEGORY_KEY = { bug: 'catBug', question: 'catQuestion', idea: 'catIdea' };
export const STATUS_KEY = { new: 'statusNew', 'in-progress': 'statusInProgress', resolved: 'statusResolved' };

// One conversation: the original message, all replies, and a reply box.
// viewer = 'user' (in Messages) or 'support' (in the Support inbox)
function SupportThread({ report, viewer, onReply }) {
  const { t, locale } = useLanguage();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const formatTime = (d) =>
    new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const messages = [
    { from: 'user', message: report.message, createdAt: report.createdAt },
    ...(report.replies || []),
  ];

  const authorOf = (m) => {
    if (m.from === 'support') return t('supportTeam');
    return viewer === 'user' ? t('you') : report.email || t('userLabel');
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await onReply(text.trim());
      setText('');
    } catch (err) {
      setError(t('reportError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="db-thread">
      {messages.map((m, i) => (
        <div key={i} className={`db-thread-msg ${m.from === viewer ? 'mine' : 'theirs'}`}>
          <div className="db-thread-meta">
            {authorOf(m)} · {formatTime(m.createdAt)}
          </div>
          <div className="db-thread-text" dir="auto">
            {m.message}
          </div>
        </div>
      ))}

      <form className="db-chat-form" onSubmit={send}>
        <textarea
          className="db-input db-textarea"
          style={{ minHeight: 60 }}
          rows={2}
          dir="auto"
          placeholder={t('writeReply')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label={t('writeReply')}
        />
        <button type="submit" className="db-btn db-btn-primary" disabled={sending || !text.trim()}>
          {sending ? t('sending') : t('sendReport')}
        </button>
      </form>

      {error && <div className="db-error" style={{ margin: 0 }}>{error}</div>}
    </div>
  );
}

export default SupportThread;