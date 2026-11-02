const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateString(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Fixed entries shown in the schedule (not counted as study):
// - weekly commitments (gym, classes) from today until the last study day
// - every upcoming one-time event (dentist, family event...)
function buildCommitmentEntries(commitments, studyEntries, oneTimeEvents = []) {
  const entries = [];
  const today = toDateString(new Date());

  if (commitments && commitments.length && studyEntries && studyEntries.length) {
    const sortedDates = studyEntries.map((e) => e.date).sort();
    const end = parseDateString(sortedDates[sortedDates.length - 1]);

    const current = new Date();
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dayName = DAYS[current.getDay()];
      for (const c of commitments) {
        if (c.day === dayName) {
          entries.push({
            date: toDateString(current),
            task: c.label,
            hours: c.endHour - c.startHour,
            startHour: c.startHour,
            endHour: c.endHour,
            type: 'commitment',
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }
  }

  (oneTimeEvents || [])
    .filter((e) => e.date >= today)
    .forEach((e) => {
      entries.push({
        date: e.date,
        task: e.label,
        hours: e.endHour - e.startHour,
        startHour: e.startHour,
        endHour: e.endHour,
        type: 'commitment',
      });
    });

  return entries;
}

module.exports = buildCommitmentEntries;