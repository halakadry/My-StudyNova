import { useLanguage } from '../i18n/useLanguage';

// Performance Analytics Dashboard (Phase A book, Section 4.8.4 / Screen 4)

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - dt.getDay());
  return toDateString(dt);
}

function formatShort(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d}.${m}`;
}

function Analytics({ tasks, schedule, quizResults = [] }) {
  const { t, locale } = useLanguage();
  const today = toDateString(new Date());
  const studyEntries = (schedule?.entries || []).filter((e) => e.type !== 'commitment');

  // Task completion rate
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((tk) => tk.status === 'completed').length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : null;

  // Schedule adherence: sessions due up to today that were marked done
  const dueSessions = studyEntries.filter((e) => e.date <= today);
  const dueDone = dueSessions.filter((e) => e.completed).length;
  const adherence = dueSessions.length ? Math.round((dueDone / dueSessions.length) * 100) : null;

  // Study hours
  const hoursPlanned = studyEntries.reduce((sum, e) => sum + e.hours, 0);
  const hoursDone = studyEntries.filter((e) => e.completed).reduce((sum, e) => sum + e.hours, 0);

  // Weekly planned vs done
  const weeks = {};
  studyEntries.forEach((e) => {
    const w = weekStart(e.date);
    if (!weeks[w]) weeks[w] = { planned: 0, done: 0 };
    weeks[w].planned += e.hours;
    if (e.completed) weeks[w].done += e.hours;
  });
  const weekList = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  const maxHours = Math.max(1, ...weekList.map(([, w]) => w.planned));

  // Flashcard practice
  const quizKnown = quizResults.reduce((sum, q) => sum + q.known, 0);
  const quizTotal = quizResults.reduce((sum, q) => sum + q.total, 0);
  const avgScore = quizTotal ? Math.round((quizKnown / quizTotal) * 100) : null;

  return (
    <>
      <div className="db-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="db-stat">
          <div className="db-stat-label">{t('taskCompletion')}</div>
          <div className="db-stat-value">{completionRate === null ? '—' : `${completionRate}%`}</div>
          <div className="db-stat-note">{t('ofTasks', { a: completedTasks, b: totalTasks })}</div>
        </div>
        <div className="db-stat">
          <div className="db-stat-label">{t('adherence')}</div>
          <div className="db-stat-value">{adherence === null ? '—' : `${adherence}%`}</div>
          <div className="db-stat-note">{t('sessionsDue', { a: dueDone, b: dueSessions.length })}</div>
        </div>
        <div className="db-stat">
          <div className="db-stat-label">{t('hoursDone')}</div>
          <div className="db-stat-value">{t('hours', { n: hoursDone })}</div>
          <div className="db-stat-note">{t('ofPlanned', { n: hoursPlanned })}</div>
        </div>
      </div>

      <div className="db-panel">
        <h2 className="db-section-title">{t('hoursPerWeek')}</h2>
        <div className="db-legend">
          <span>
            <span className="db-legend-swatch" style={{ background: 'var(--db-sage-strong)' }} />
            {t('planned')}
          </span>
          <span>
            <span className="db-legend-swatch" style={{ background: 'var(--db-olive)' }} />
            {t('doneLegend')}
          </span>
        </div>

        {weekList.length === 0 && <p className="db-empty">{t('generateToSee')}</p>}

        {weekList.map(([week, w]) => (
          <div key={week} className="db-bar-row">
            <div className="db-bar-label">{t('weekOf', { d: formatShort(week) })}</div>
            <div className="db-bar-track">
              <div className="db-bar-planned" style={{ width: `${(w.planned / maxHours) * 100}%` }} />
              <div className="db-bar-done" style={{ width: `${(w.done / maxHours) * 100}%` }} />
            </div>
            <div className="db-bar-value">
              {w.done}/{t('hours', { n: w.planned })}
            </div>
          </div>
        ))}
      </div>

      <div className="db-panel" style={{ marginTop: 24 }}>
        <h2 className="db-section-title">{t('quizResults')}</h2>

        {quizResults.length === 0 ? (
          <p className="db-empty">{t('noQuizzes')}</p>
        ) : (
          <>
            <div className="db-stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
              <div className="db-stat">
                <div className="db-stat-label">{t('avgScore')}</div>
                <div className="db-stat-value">{avgScore === null ? '—' : `${avgScore}%`}</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">{t('quizzesTaken')}</div>
                <div className="db-stat-value">{quizResults.length}</div>
              </div>
            </div>

            <h3 className="db-subheading" style={{ marginTop: 0 }}>
              {t('recentQuizzes')}
            </h3>
            {quizResults.slice(0, 5).map((q) => (
              <div key={q._id} className="db-quiz-row">
                <span dir="auto">{q.title}</span>
                <span className="db-item-meta">
                  {q.known}/{q.total} · {new Date(q.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

export default Analytics;