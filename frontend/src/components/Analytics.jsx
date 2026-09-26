// Performance Analytics Dashboard (Phase A book, Section 4.8.4 / Screen 4)

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns the Sunday that starts the week of a YYYY-MM-DD date
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

  // 1. Task completion rate
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : null;

  // 2. Schedule adherence: sessions planned up to today that were marked done
  const dueSessions = studyEntries.filter((e) => e.date <= today);
  const dueDone = dueSessions.filter((e) => e.completed).length;
  const adherence = dueSessions.length ? Math.round((dueDone / dueSessions.length) * 100) : null;

  // 3. Study hours done vs planned
  const hoursPlanned = studyEntries.reduce((sum, e) => sum + e.hours, 0);
  const hoursDone = studyEntries.filter((e) => e.completed).reduce((sum, e) => sum + e.hours, 0);

  // 4. Weekly chart data: planned vs done hours per week
  const weeks = {};
  studyEntries.forEach((e) => {
    const w = weekStart(e.date);
    if (!weeks[w]) weeks[w] = { planned: 0, done: 0 };
    weeks[w].planned += e.hours;
    if (e.completed) weeks[w].done += e.hours;
  });
  const weekList = Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b));
  const maxHours = Math.max(1, ...weekList.map(([, w]) => w.planned));

  const cardStyle = { border: '1px solid #ddd', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' };
  const smallText = { fontSize: 12, color: '#666' };

  return (
    <div style={{ marginTop: 32, border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h3>Performance Analytics</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div>Task completion</div>
          <h2>{completionRate === null ? '—' : `${completionRate}%`}</h2>
          <div style={smallText}>
            {completedTasks} of {totalTasks} tasks
          </div>
        </div>
        <div style={cardStyle}>
          <div>Schedule adherence</div>
          <h2>{adherence === null ? '—' : `${adherence}%`}</h2>
          <div style={smallText}>
            {dueDone} of {dueSessions.length} sessions due so far
          </div>
        </div>
        <div style={cardStyle}>
          <div>Study hours</div>
          <h2>{hoursDone}h</h2>
          <div style={smallText}>of {hoursPlanned}h planned</div>
        </div>
      </div>

      <h4 style={{ marginBottom: 8 }}>Study hours per week</h4>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 12 }}>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#c9d6ea', marginRight: 4 }} />
          Planned
        </span>
        <span>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: '#2f6fbf', marginRight: 4 }} />
          Done
        </span>
      </div>

      {weekList.length === 0 && <p style={smallText}>Generate a schedule to see your weekly hours.</p>}

      {weekList.map(([week, w]) => (
        <div key={week} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 90, fontSize: 13 }}>Week of {formatShort(week)}</div>
          <div style={{ flex: 1, background: '#f5f5f5', borderRadius: 4, height: 20, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(w.planned / maxHours) * 100}%`,
                background: '#c9d6ea',
                borderRadius: 4,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(w.done / maxHours) * 100}%`,
                background: '#2f6fbf',
                borderRadius: 4,
              }}
            />
          </div>
          <div style={{ width: 70, fontSize: 13, textAlign: 'right' }}>
            {w.done}/{w.planned}h
          </div>
        </div>
      ))}
    </div>
  );
}

export default Analytics;