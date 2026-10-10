import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/useLanguage';
import { downloadScheduleIcs } from '../utils/exportCalendar';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 – 22:00

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ verticalAlign: '-3px', marginInlineEnd: 6 }}
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CalendarExport({ entries, exams }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [startHour, setStartHour] = useState(16);
  const [includeExams, setIncludeExams] = useState(true);
  const [includeCommitments, setIncludeCommitments] = useState(false);
  const [message, setMessage] = useState('');

  // Close with Esc
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleDownload = () => {
    const count = downloadScheduleIcs(entries, exams, {
      startHour,
      includeExams,
      includeCommitments,
          // Prefix in the same language as the name, so the calendar shows it correctly
      studyTitle: (name) =>
        /[\u0590-\u05FF]/.test(name) ? `לימוד: ${name}` : /[\u0600-\u06FF]/.test(name) ? `دراسة: ${name}` : t('studyEvent', { s: name }),
      examTitle: (name) =>
        /[\u0590-\u05FF]/.test(name) ? `מבחן: ${name}` : /[\u0600-\u06FF]/.test(name) ? `امتحان: ${name}` : t('examEvent', { s: name }),
    });
    setMessage(count ? t('icsDownloaded', { n: count }) : t('nothingToExport'));
  };

  return (
    <>
      <button
        type="button"
        className="db-btn"
        onClick={() => {
          setMessage('');
          setOpen(true);
        }}
      >
        <CalendarIcon />
        {t('addToCalendar')}
      </button>

      {open && (
        <div className="db-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div
            className="db-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="db-panel-head">
              <h2 id="calendar-title" className="db-section-title">
                {t('calendarTitle')}
              </h2>
              <button type="button" className="db-btn db-btn-small db-btn-ghost" onClick={() => setOpen(false)}>
                {t('close')}
              </button>
            </div>

            <p className="db-subtle" style={{ marginTop: 0 }}>
              {t('calendarHint')}
            </p>

            <div className="db-support-form">
              <div className="db-field">
                <label htmlFor="cal-start">{t('studyStartLabel')}</label>
                <select
                  id="cal-start"
                  className="db-select"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>

              <label className="db-check">
                <input type="checkbox" checked={includeExams} onChange={(e) => setIncludeExams(e.target.checked)} />
                {t('includeExams')}
              </label>
              <label className="db-check">
                <input
                  type="checkbox"
                  checked={includeCommitments}
                  onChange={(e) => setIncludeCommitments(e.target.checked)}
                />
                {t('includeCommitments')}
              </label>

              <button type="button" className="db-btn db-btn-primary" onClick={handleDownload}>
                {t('downloadIcs')}
              </button>

              {message && <p className="db-success" style={{ margin: 0 }}>{message}</p>}

              <div className="db-import-help">
                <strong>{t('howToImport')}</strong>
                <ul>
                  <li>{t('importGoogle')}</li>
                  <li>{t('importApple')}</li>
                  <li>{t('importOutlook')}</li>
                </ul>
                <p className="db-item-meta" style={{ margin: 0 }}>
                  {t('importTip')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CalendarExport;