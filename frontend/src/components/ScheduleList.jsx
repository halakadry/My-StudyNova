// Schedule grouped by day: one card per date with its commitments + study sessions

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${d}.${m}.${y}`;
}

function ScheduleList({ entries, onToggle }) {
  const today = toDateString(new Date());

  const byDate = {};
  entries.forEach((e) => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });
  const dates = Object.keys(byDate).sort();

  return (
    <div>
      {dates.map((date) => {
        const items = byDate[date].sort(
          (a, b) => (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1)
        );
        const studyHours = items
          .filter((e) => e.type !== 'commitment')
          .reduce((sum, e) => sum + e.hours, 0);
        const isToday = date === today;
        const isPast = date < today;

        return (
          <div key={date} className={`db-daycard ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
            <div className="db-daycard-head">
              <strong>
                {formatDayHeader(date)}
                {isToday && <span className="db-today-badge">Today</span>}
              </strong>
              <span className="db-item-meta">{studyHours > 0 ? `${studyHours}h study` : 'No study'}</span>
            </div>
            <div className="db-daycard-body">
              {items.map((entry, i) => (
                <div
                  key={entry._id || i}
                  className={`db-row ${entry.type === 'commitment' ? 'commitment' : 'study'} ${
                    entry.completed ? 'done' : ''
                  }`}
                >
                  <span className="db-row-text">
                    {entry.type === 'commitment'
                      ? `${entry.task} · ${entry.startHour}:00–${entry.endHour}:00`
                      : `${entry.task} · ${entry.hours}h`}
                  </span>
                  {entry.type !== 'commitment' && (
                    <button className="db-btn db-btn-small" onClick={() => onToggle(entry)}>
                      {entry.completed ? 'Undo' : '✓ Done'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScheduleList;