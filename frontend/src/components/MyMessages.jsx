import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';
import SupportThread, { CATEGORY_KEY, STATUS_KEY } from './SupportThread';

// The user's own support conversations ("Messages" tab)
function MyMessages({ onUnreadChange, onNewMessage }) {
  const { t, locale } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/reports/mine');
        setReports(res.data);
      } catch (err) {
        setError(t('reportError'));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (report) => {
    if (openId === report._id) {
      setOpenId(null);
      return;
    }
    setOpenId(report._id);
    if (report.userUnread) {
      try {
        await api.post(`/reports/${report._id}/read`);
        setReports((prev) => prev.map((r) => (r._id === report._id ? { ...r, userUnread: false } : r)));
        onUnreadChange?.();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const reply = async (id, message) => {
    const res = await api.post(`/reports/${id}/reply`, { message });
    setReports((prev) => prev.map((r) => (r._id === id ? res.data : r)));
  };

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <h2 className="db-section-title">{t('myMessages')}</h2>
        <button className="db-btn db-btn-primary db-btn-small" onClick={onNewMessage}>
          {t('newMessage')}
        </button>
      </div>

      {loading && <p className="db-empty">{t('loadingMessages')}</p>}
      {error && <div className="db-error">{error}</div>}
      {!loading && !error && reports.length === 0 && <p className="db-empty">{t('noMessages')}</p>}

      {reports.map((r) => (
        <div key={r._id} className={`db-ticket ${r.userUnread ? 'unread' : ''}`}>
          <button
            type="button"
            className="db-ticket-head"
            onClick={() => toggle(r)}
            aria-expanded={openId === r._id}
          >
            <span className="db-ticket-title" dir="auto">
              {r.userUnread && <span className="db-dot" title={t('newReply')} />}
              {r.message.length > 80 ? `${r.message.slice(0, 80)}…` : r.message}
            </span>
            <span className="db-ticket-meta">
              {t(CATEGORY_KEY[r.category] || 'catBug')} ·{' '}
              <span className={`db-status ${r.status}`}>{t(STATUS_KEY[r.status] || 'statusNew')}</span> ·{' '}
              {new Date(r.updatedAt).toLocaleDateString(locale)}
              {r.userUnread && <strong className="db-new-label"> · {t('newReply')}</strong>}
            </span>
          </button>
          {openId === r._id && <SupportThread report={r} viewer="user" onReply={(m) => reply(r._id, m)} />}
        </div>
      ))}
    </div>
  );
}

export default MyMessages;