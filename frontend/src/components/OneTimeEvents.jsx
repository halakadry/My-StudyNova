import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import api from '../services/api';
import { useLanguage } from '../i18n/useLanguage';

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function OneTimeEvents({ userId, onChanged }) {
  const { t, locale } = useLanguage();
  const today = toDateString(new Date());

  const [events, setEvents] = useState([]);
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Always load the latest events from the server when Settings opens
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/users/${auth.currentUser.uid}`);
        setEvents(res.data.oneTimeEvents || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const save = async (newList) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.put(`/users/${userId}/settings`, { oneTimeEvents: newList });
      setEvents(res.data.oneTimeEvents || []);
      onChanged?.(); // rebuild the schedule
      return true;
    } catch (err) {
      setError(t('errEventSave'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addEvent = async () => {
    if (!date || !label.trim() || start === '' || end === '') return;
    if (Number(start) >= Number(end)) {
      setError(t('errEventTime'));
      return;
    }
    const ok = await save([
      ...events,
      { date, label: label.trim(), startHour: Number(start), endHour: Number(end) },
    ]);
    if (ok) {
      setDate('');
      setLabel('');
      setStart('');
      setEnd('');
    }
  };

  const removeEvent = (index) => save(events.filter((_, i) => i !== index));

  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ marginTop: 28 }}>
      <h3 className="db-section-title" style={{ fontSize: 17 }}>
        {t('oneTimeEvents')}
      </h3>
      <p className="db-subtle" style={{ margin: '0 0 8px' }}>
        {t('oneTimeHint')}
      </p>

      {events.length === 0 && <p className="db-empty">{t('noEvents')}</p>}
      {events.map((e, i) => (
        <div key={e._id || i} className="db-commitment-row">
          <span dir="auto">
            <strong>{formatDate(e.date)}</strong> — {e.label} ({e.startHour}:00–{e.endHour}:00)
          </span>
          <button
            className="db-btn db-btn-small db-btn-danger"
            onClick={() => removeEvent(i)}
            disabled={saving}
          >
            {t('remove')}
          </button>
        </div>
      ))}

      <div className="db-commitment-add">
        <div className="db-field">
          <label htmlFor="ev-date">{t('date')}</label>
          <input
            id="ev-date"
            className="db-input"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="db-field">
          <label htmlFor="ev-label">{t('label')}</label>
          <input
            id="ev-label"
            className="db-input"
            type="text"
            dir="auto"
            placeholder={t('eventPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="db-field">
          <label htmlFor="ev-start">{t('start')}</label>
          <input
            id="ev-start"
            className="db-input db-input-small"
            type="number"
            min="0"
            max="23"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="db-field">
          <label htmlFor="ev-end">{t('end')}</label>
          <input
            id="ev-end"
            className="db-input db-input-small"
            type="number"
            min="1"
            max="24"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <button
          className="db-btn"
          onClick={addEvent}
          disabled={saving || !date || !label.trim() || start === '' || end === ''}
        >
          {saving ? t('saving') : t('add')}
        </button>
      </div>

      {error && (
        <div className="db-error" style={{ margin: '12px 0 0' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default OneTimeEvents;