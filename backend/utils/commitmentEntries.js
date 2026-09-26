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

// Creates fixed entries for every recurring commitment between today and the last study entry
function buildCommitmentEntries(commitments, studyEntries) {
  if (!commitments || commitments.length === 0 || !studyEntries || studyEntries.length === 0) return [];

  const sortedDates = studyEntries.map((e) => e.date).sort();
  const end = parseDateString(sortedDates[sortedDates.length - 1]);

  const current = new Date();
  current.setHours(0, 0, 0, 0);

  const entries = [];
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
  return entries;
}

module.exports = buildCommitmentEntries;