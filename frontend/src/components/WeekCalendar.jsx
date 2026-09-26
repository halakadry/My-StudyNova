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
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week, -1 = last week

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateString(today);

  // Sunday of the week being shown
  const weekStart = addDays(today, -today.getDay() + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  // Group entries by date
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
      {/* Week navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ padding: '4px 10px' }}>
          ← Prev
        </button>
        <div style={{ textAlign: 'center' }}>
          <strong>{weekLabel}</strong>
          <div style={{ fontSize: 12, color: '#666' }}>{weekStudyHours}h study this week</div>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ padding: '2px 8px', marginTop: 4, fontSize: 12 }}>
              This week
            </button>
          )}
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} style={{ padding: '4px 10px' }}>
          Next →
        </button>
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {days.map((d) => {
          const dateStr = toDateString(d);
          const items = (byDate[dateStr] || []).sort(
            (a, b) => (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1)
          );
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <div
              key={dateStr}
              style={{
                border: isToday ? '2px solid #2f6fbf' : '1px solid #ddd',
                borderRadius: 8,
                minHeight: 160,
                background: isToday ? '#f5f9ff' : 'white',
                opacity: isPast ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '6px 4px',
                  borderBottom: '1px solid #eee',
                  background: isToday ? '#eaf1fb' : '#fafafa',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <div style={{ fontSize: 12, color: isToday ? '#2f6fbf' : '#666' }}>{DAY_NAMES[d.getDay()]}</div>
                <strong style={{ fontSize: 14 }}>
                  {d.getDate()}.{d.getMonth() + 1}
                </strong>
              </div>

              <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                {items.map((entry, i) =>
                  entry.type === 'commitment' ? (
                    <div
                      key={entry._id || i}
                      style={{
                        background: '#f3f0ff',
                        color: '#5b4b8a',
                        borderRadius: 4,
                        padding: '4px 5px',
                        fontSize: 11,
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{entry.task}</div>
                      <div>
                        {entry.startHour}:00–{entry.endHour}:00
                      </div>
                    </div>
                  ) : (
                    <div
                      key={entry._id || i}
                      style={{
                        background: entry.completed ? '#eef5ee' : '#eaf1fb',
                        borderRadius: 4,
                        padding: '4px 5px',
                        fontSize: 11,
                        wordBreak: 'break-word',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          textDecoration: entry.completed ? 'line-through' : 'none',
                          opacity: entry.completed ? 0.6 : 1,
                        }}
                      >
                        {entry.task}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{entry.hours}h</span>
                        <button
                          onClick={() => onToggle(entry)}
                          title={entry.completed ? 'Undo' : 'Mark done'}
                          style={{ padding: '0 5px', fontSize: 11 }}
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