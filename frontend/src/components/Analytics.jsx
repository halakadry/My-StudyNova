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

function Analytics({ tasks, schedule }) {
  const today = toDateString(new Date());
  const studyEntries = (schedule?.entries || []).filter((e) => e.type !== 'commitment');

  // Task completion rate
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
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

  return (
    <>
      <div className="db-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="db-stat">
          <div className="db-stat-label">Task completion</div>
          <div className="db-stat-value">{completionRate === null ? '—' : `${completionRate}%`}</div>
          <div className="db-stat-note">
            {completedTasks} of {totalTasks} tasks
          </div>
        </div>
        <div className="db-stat">
          <div className="db-stat-label">Schedule adherence</div>
          <div className="db-stat-value">{adherence === null ? '—' : `${adherence}%`}</div>
          <div className="db-stat-note">
            {dueDone} of {dueSessions.length} sessions due so far
          </div>
        </div>
        <div className="db-stat">
          <div className="db-stat-label">Study hours done</div>
          <div className="db-stat-value">{hoursDone}h</div>
          <div className="db-stat-note">of {hoursPlanned}h planned</div>
        </div>
      </div>

      <div className="db-panel">
        <h2 className="db-section-title">Study hours per week</h2>
        <div className="db-legend">
          <span>
            <span className="db-legend-swatch" style={{ background: 'var(--db-sage-strong)' }} />
            Planned
          </span>
          <span>
            <span className="db-legend-swatch" style={{ background: 'var(--db-olive)' }} />
            Done
          </span>
        </div>

        {weekList.length === 0 && <p className="db-empty">Generate a schedule to see your weekly hours.</p>}

        {weekList.map(([week, w]) => (
          <div key={week} className="db-bar-row">
            <div className="db-bar-label">Week of {formatShort(week)}</div>
            <div className="db-bar-track">
              <div className="db-bar-planned" style={{ width: `${(w.planned / maxHours) * 100}%` }} />
              <div className="db-bar-done" style={{ width: `${(w.done / maxHours) * 100}%` }} />
            </div>
            <div className="db-bar-value">
              {w.done}/{w.planned}h
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Analytics;