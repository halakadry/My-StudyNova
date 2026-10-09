import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';

function SupportModal({ open, onClose, prefill, userId, page }) {
  const { t, lang } = useLanguage();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Reset the form every time it opens (with the error text, if there is one)
  useEffect(() => {
    if (open) {
      setCategory('bug');
      setMessage(prefill || '');
      setSent(false);
      setError('');
    }
  }, [open, prefill]);

  // Close with Esc
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.post('/reports', {
        userId,
        email: auth.currentUser?.email,
        category,
        message,
        page,
        language: lang,
        userAgent: navigator.userAgent,
      });
      setSent(true);
    } catch (err) {
      setError(t('reportError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="db-modal-backdrop" onMouseDown={onClose}>
      <div
        className="db-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="db-panel-head">
          <h2 id="support-title" className="db-section-title">
            {t('contactSupport')}
          </h2>
          <button type="button" className="db-btn db-btn-small db-btn-ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>

        {sent ? (
          <p className="db-success" style={{ fontSize: 15 }}>
            {t('reportSent')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="db-support-form">
            <p className="db-subtle" style={{ margin: 0 }}>
              {t('supportHint')}
            </p>

            <div className="db-field">
              <label htmlFor="support-type">{t('supportType')}</label>
              <select
                id="support-type"
                className="db-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="bug">{t('catBug')}</option>
                <option value="question">{t('catQuestion')}</option>
                <option value="idea">{t('catIdea')}</option>
              </select>
            </div>

            <div className="db-field">
              <label htmlFor="support-message">{t('messageLabel')}</label>
              <textarea
                id="support-message"
                className="db-input db-textarea"
                dir="auto"
                rows={5}
                placeholder={t('messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <p className="db-item-meta" style={{ margin: 0 }}>
              {t('supportInfo')}
            </p>

            {error && <div className="db-error">{error}</div>}

            <button type="submit" className="db-btn db-btn-primary" disabled={sending || !message.trim()}>
              {sending ? t('sending') : t('sendReport')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default SupportModal;