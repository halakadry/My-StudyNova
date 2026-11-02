import { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';
import SupportThread, { CATEGORY_KEY, STATUS_KEY } from './SupportThread';

// All users' conversations - only for the StudyNova team ("Support inbox" tab)
function AdminInbox() {
  const { t, locale } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // 'open' or 'all'
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/reports/admin/all');
      setReports(res.data);
      setError('');
    } catch (err) {
      setError(t('reportError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replace = (updated) => setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));

  const toggle = async (report) => {
    if (openId === report._id) {
      setOpenId(null);
      return;
    }
    setOpenId(report._id);
    if (report.supportUnread) {
      try {
        await api.post(`/reports/admin/${report._id}/read`);
        replace({ ...report, supportUnread: false });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const reply = async (id, message) => {
    const res = await api.post(`/reports/admin/${id}/reply`, { message });
    replace(res.data);
  };

  const setStatus = async (id, status) => {
    try {
      const res = await api.patch(`/reports/admin/${id}/status`, { status });
      replace(res.data);
    } catch (err) {
      setError(t('reportError'));
    }
  };

  const shown = filter === 'open' ? reports.filter((r) => r.status !== 'resolved') : reports;
  const unreadCount = reports.filter((r) => r.supportUnread).length;

  return (
    <div className="db-panel">
      <div className="db-panel-head">
        <h2 className="db-section-title">
          {t('inbox')}
          {unreadCount > 0 && <span className="db-tab-badge">{unreadCount}</span>}
        </h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="db-toggle">
            <button className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>
              {t('filterOpen')}
            </button>
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              {t('filterAll')}
            </button>
          </div>
          <button className="db-btn db-btn-small" onClick={load}>
            {t('refresh')}
          </button>
        </div>
      </div>

      {loading && <p className="db-empty">{t('loadingMessages')}</p>}
      {error && <div className="db-error">{error}</div>}
      {!loading && shown.length === 0 && <p className="db-empty">{t('inboxEmpty')}</p>}

      {shown.map((r) => (
        <div key={r._id} className={`db-ticket ${r.supportUnread ? 'unread' : ''}`}>
          <button
            type="button"
            className="db-ticket-head"
            onClick={() => toggle(r)}
            aria-expanded={openId === r._id}
          >
            <span className="db-ticket-title" dir="auto">
              {r.supportUnread && <span className="db-dot" />}
              {r.message.length > 80 ? `${r.message.slice(0, 80)}…` : r.message}
            </span>
            <span className="db-ticket-meta">
              {r.email || t('userLabel')} · {t(CATEGORY_KEY[r.category] || 'catBug')} ·{' '}
              <span className={`db-status ${r.status}`}>{t(STATUS_KEY[r.status] || 'statusNew')}</span> ·{' '}
              {new Date(r.updatedAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>

          {openId === r._id && (
            <>
              <SupportThread report={r} viewer="support" onReply={(m) => reply(r._id, m)} />
              <div className="db-ticket-actions">
                {r.status !== 'resolved' ? (
                  <button className="db-btn db-btn-small" onClick={() => setStatus(r._id, 'resolved')}>
                    {t('markResolved')}
                  </button>
                ) : (
                  <button className="db-btn db-btn-small" onClick={() => setStatus(r._id, 'in-progress')}>
                    {t('reopen')}
                  </button>
                )}
                <span className="db-item-meta" dir="ltr">
                  {t('tabLabel')}: {r.page || '-'} · {r.language || '-'}
                </span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default AdminInbox;