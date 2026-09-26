import { useState } from 'react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function WeekCalendar({ entries, onToggle }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateString(today);

  const weekStart = addDays(today, -today.getDay() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const byDate = {};
  entries.forEach((e) => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const weekLabel = `${weekStart.getDate()}.${weekStart.getMonth() + 1} – ${weekEnd.getDate()}.${
    weekEnd.getMonth() + 1
  }.${weekEnd.getFullYear()}`;

  const weekStudyHours = days
    .flatMap((d) => byDate[toDateString(d)] || [])
    .filter((e) => e.type !== 'commitment')
    .reduce((sum, e) => sum + e.hours, 0);

  return (
    <div>
      <div className="db-week-nav">
        <button className="db-btn db-btn-small" onClick={() => setWeekOffset(weekOffset - 1)}>
          ← Prev
        </button>
        <div className="db-week-label">
          <strong>{weekLabel}</strong>
          <div className="db-item-meta">{weekStudyHours}h study this week</div>
          {weekOffset !== 0 && (
            <button className="db-btn db-btn-small" style={{ marginTop: 6 }} onClick={() => setWeekOffset(0)}>
              This week
            </button>
          )}
        </div>
        <button className="db-btn db-btn-small" onClick={() => setWeekOffset(weekOffset + 1)}>
          Next →
        </button>
      </div>

      <div className="db-week-grid">
        {days.map((d) => {
          const dateStr = toDateString(d);
          const items = (byDate[dateStr] || []).sort(
            (a, b) => (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1)
          );
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <div key={dateStr} className={`db-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
              <div className="db-day-head">
                <div className="db-day-name">{DAY_NAMES[d.getDay()]}</div>
                <div className="db-day-date">
                  {d.getDate()}.{d.getMonth() + 1}
                </div>
              </div>

              <div className="db-day-body">
                {items.map((entry, i) =>
                  entry.type === 'commitment' ? (
                    <div key={entry._id || i} className="db-chip commitment">
                      <div className="db-chip-title">{entry.task}</div>
                      <div>
                        {entry.startHour}:00–{entry.endHour}:00
                      </div>
                    </div>
                  ) : (
                    <div key={entry._id || i} className={`db-chip study ${entry.completed ? 'done' : ''}`}>
                      <div className="db-chip-title">{entry.task}</div>
                      <div className="db-chip-foot">
                        <span>{entry.hours}h</span>
                        <button
                          onClick={() => onToggle(entry)}
                          title={entry.completed ? 'Undo' : 'Mark done'}
                          aria-label={entry.completed ? 'Undo' : 'Mark done'}
                        >
                          {entry.completed ? '↺' : '✓'}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekCalendar;