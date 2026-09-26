// Shows the schedule grouped by day: one card per date with its gym + study items

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

  // Group entries by date
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
          <div
            key={date}
            style={{
              border: isToday ? '2px solid #2f6fbf' : '1px solid #ddd',
              borderRadius: 8,
              marginBottom: 10,
              overflow: 'hidden',
              opacity: isPast ? 0.7 : 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: isToday ? '#eaf1fb' : '#fafafa',
                borderBottom: '1px solid #eee',
              }}
            >
              <strong>
                {formatDayHeader(date)}
                {isToday && <span style={{ color: '#2f6fbf', marginLeft: 8 }}>Today</span>}
              </strong>
              <span style={{ fontSize: 13, color: '#666' }}>
                {studyHours > 0 ? `${studyHours}h study` : 'No study'}
              </span>
            </div>

            {items.map((entry, i) => (
              <div
                key={entry._id || i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none',
                  background: entry.type === 'commitment' ? '#f3f0ff' : 'white',
                  color: entry.type === 'commitment' ? '#5b4b8a' : 'inherit',
                }}
              >
                <span
                  style={{
                    textDecoration: entry.completed ? 'line-through' : 'none',
                    opacity: entry.completed ? 0.6 : 1,
                  }}
                >
                  {entry.type === 'commitment'
                    ? `${entry.task} · ${entry.startHour}:00–${entry.endHour}:00`
                    : `${entry.task} · ${entry.hours}h`}
                </span>
                {entry.type !== 'commitment' && (
                  <button onClick={() => onToggle(entry)} style={{ padding: '2px 8px' }}>
                    {entry.completed ? 'Undo' : '✓ Done'}
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default ScheduleList;