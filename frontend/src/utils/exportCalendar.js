// Builds an .ics calendar file from the StudyNova schedule (works with Google, Apple, Outlook)

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Local "floating" time: the calendar shows it in the user's own time zone
function icsDateTime(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function icsDate(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function icsStampUtc() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Long lines must be folded (continuation lines start with a space)
function fold(line) {
  const chars = Array.from(line);
  if (chars.length <= 60) return line;
  const parts = [];
  for (let i = 0; i < chars.length; i += 60) parts.push(chars.slice(i, i + 60).join(''));
  return parts.join('\r\n ');
}

// Gives each study session of one day a start/end time, skipping commitments
function placeSessions(sessions, busySlots, startHour) {
  const busy = busySlots
    .map((c) => [c.startHour * 60, c.endHour * 60])
    .sort((a, b) => a[0] - b[0]);

  let cursor = startHour * 60;
  return sessions.map((s) => {
    const duration = Math.round(Number(s.hours) * 60);
    let moved = true;
    while (moved) {
      moved = false;
      for (const [b0, b1] of busy) {
        if (cursor < b1 && cursor + duration > b0) {
          cursor = b1;
          moved = true;
        }
      }
    }
    const placed = { ...s, startMin: cursor, endMin: cursor + duration };
    cursor = cursor + duration + 15; // 15-minute break between sessions
    return placed;
  });
}

/**
 * entries: schedule entries; exams: exam list
 * options: { startHour, includeExams, includeCommitments, studyTitle(name), examTitle(name) }
 * Returns the number of events in the file.
 */
export function downloadScheduleIcs(entries, exams, options) {
  const { startHour = 16, includeExams = true, includeCommitments = false, studyTitle, examTitle } = options;
  const today = toDateString(new Date());
  const stamp = icsStampUtc();
  const events = [];

  // Group upcoming entries by day
  const byDate = {};
  (entries || [])
    .filter((e) => e.date >= today)
    .forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

  Object.keys(byDate)
    .sort()
    .forEach((date) => {
      const dayEntries = byDate[date];
      const commitments = dayEntries.filter((e) => e.type === 'commitment');
      const study = dayEntries.filter((e) => e.type !== 'commitment' && !e.completed);
      const day = parseDate(date);

      placeSessions(study, commitments, startHour).forEach((s, i) => {
        const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, s.startMin);
        const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, s.endMin);
        events.push([
          'BEGIN:VEVENT',
          `UID:${s._id || `${date}-${i}`}@studynova`,
          `DTSTAMP:${stamp}`,
          `DTSTART:${icsDateTime(start)}`,
          `DTEND:${icsDateTime(end)}`,
          `SUMMARY:${escapeText(studyTitle(s.task))}`,
          'DESCRIPTION:StudyNova',
          'END:VEVENT',
        ]);
      });

      if (includeCommitments) {
        commitments.forEach((c, i) => {
          const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), c.startHour, 0);
          const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), c.endHour, 0);
          events.push([
            'BEGIN:VEVENT',
            `UID:commitment-${date}-${i}@studynova`,
            `DTSTAMP:${stamp}`,
            `DTSTART:${icsDateTime(start)}`,
            `DTEND:${icsDateTime(end)}`,
            `SUMMARY:${escapeText(c.task)}`,
            'END:VEVENT',
          ]);
        });
      }
    });

  if (includeExams) {
    (exams || [])
      .filter((e) => toDateString(new Date(e.date)) >= today)
      .forEach((exam) => {
        const day = parseDate(toDateString(new Date(exam.date)));
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        events.push([
          'BEGIN:VEVENT',
          `UID:exam-${exam._id}@studynova`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${icsDate(day)}`,
          `DTEND;VALUE=DATE:${icsDate(next)}`,
          `SUMMARY:${escapeText(examTitle(exam.subject))}`,
          'END:VEVENT',
        ]);
      });
  }

  if (events.length === 0) return 0;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyNova//Study Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:StudyNova',
    ...events.flat(),
    'END:VCALENDAR',
  ];
  const content = lines.map(fold).join('\r\n') + '\r\n';

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `StudyNova-${today}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return events.length;
}