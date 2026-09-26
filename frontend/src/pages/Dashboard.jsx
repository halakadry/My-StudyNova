import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';
import Analytics from '../components/Analytics';
import ScheduleList from '../components/ScheduleList';
import WeekCalendar from '../components/WeekCalendar';
import TaskItem from '../components/TaskItem';
import ExamItem from '../components/ExamItem';
import './Dashboard.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'work', label: 'Tasks & Exams' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function Dashboard({ dbUser }) {
  const [tab, setTab] = useState('overview');

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [durationHours, setDurationHours] = useState('');
  const [taskAdding, setTaskAdding] = useState(false);
  const [error, setError] = useState('');

  const [exams, setExams] = useState([]);
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examDifficulty, setExamDifficulty] = useState('Medium');

  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleView, setScheduleView] = useState('week');

  const [sleepTime, setSleepTime] = useState(23);
  const [wakeTime, setWakeTime] = useState(8);
  const [commitments, setCommitments] = useState([]);
  const [newCommitmentDay, setNewCommitmentDay] = useState('Monday');
  const [newCommitmentLabel, setNewCommitmentLabel] = useState('');
  const [newCommitmentStart, setNewCommitmentStart] = useState('');
  const [newCommitmentEnd, setNewCommitmentEnd] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  /* ---------- Data loading ---------- */

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/user/${dbUser._id}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await api.get(`/exams/user/${dbUser._id}`);
      setExams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load the saved schedule when the page opens (404 = no schedule yet, that's fine)
  const fetchSchedule = async () => {
    try {
      const res = await api.get(`/schedule/${dbUser._id}`);
      setSchedule(res.data);
    } catch (err) {
      setSchedule(null);
    }
  };

  // Dynamic re-scheduling: called automatically after any task/exam change
  const refreshSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await api.post('/schedule/reschedule', { userId: dbUser._id });
      setSchedule(res.data);
    } catch (err) {
      await fetchSchedule();
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser?._id) {
      fetchTasks();
      fetchExams();
      fetchSchedule();
      setSleepTime(dbUser.sleepTime ?? 23);
      setWakeTime(dbUser.wakeTime ?? 8);
      setCommitments(dbUser.recurringCommitments ?? []);
    }
  }, [dbUser]);

  /* ---------- Tasks ---------- */

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    setTaskAdding(true);
    try {
      await api.post('/tasks', {
        userId: dbUser._id,
        title,
        deadline,
        difficulty,
        durationHours: durationHours === '' ? null : Number(durationHours),
      });
      setTitle('');
      setDeadline('');
      setDifficulty('Easy');
      setDurationHours('');
      fetchTasks();
      refreshSchedule();
    } catch (err) {
      setError('Could not add task.');
    } finally {
      setTaskAdding(false);
    }
  };

  const saveTask = async (taskId, updates) => {
    await api.put(`/tasks/${taskId}`, updates);
    fetchTasks();
    refreshSchedule();
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      refreshSchedule();
    } catch (err) {
      setError('Could not delete task.');
    }
  };

  const toggleComplete = async (task) => {
    try {
      await api.put(`/tasks/${task._id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      });
      fetchTasks();
      refreshSchedule();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- Exams ---------- */

  const handleAddExam = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/exams', {
        userId: dbUser._id,
        subject: examSubject,
        date: examDate,
        difficulty: examDifficulty,
      });
      setExamSubject('');
      setExamDate('');
      setExamDifficulty('Medium');
      fetchExams();
      refreshSchedule();
    } catch (err) {
      setError('Could not add exam.');
    }
  };

  const saveExam = async (examId, updates) => {
    await api.put(`/exams/${examId}`, updates);
    fetchExams();
    refreshSchedule();
  };

  const deleteExam = async (examId) => {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await api.delete(`/exams/${examId}`);
      fetchExams();
      refreshSchedule();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------- Schedule ---------- */

  const generateSchedule = async () => {
    setScheduleLoading(true);
    setError('');
    try {
      const res = await api.post('/schedule/generate', { userId: dbUser._id });
      setSchedule(res.data);
    } catch (err) {
      setError('Could not generate schedule. Add a task or exam first.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleSessionDone = async (entry) => {
    try {
      const res = await api.patch(`/schedule/entry/${entry._id}/toggle`);
      setSchedule(res.data);
    } catch (err) {
      setError('Could not update session. Try clicking Generate AI Schedule once.');
    }
  };

  /* ---------- Settings ---------- */

  const addCommitment = () => {
    if (!newCommitmentLabel || newCommitmentStart === '' || newCommitmentEnd === '') return;
    setCommitments([
      ...commitments,
      {
        day: newCommitmentDay,
        label: newCommitmentLabel,
        startHour: Number(newCommitmentStart),
        endHour: Number(newCommitmentEnd),
      },
    ]);
    setNewCommitmentLabel('');
    setNewCommitmentStart('');
    setNewCommitmentEnd('');
  };

  const removeCommitment = (index) => {
    setCommitments(commitments.filter((_, i) => i !== index));
  };

  const saveSettings = async () => {
    setError('');
    setSettingsSaved(false);
    try {
      await api.put(`/users/${dbUser._id}/settings`, {
        sleepTime: Number(sleepTime),
        wakeTime: Number(wakeTime),
        recurringCommitments: commitments,
      });
      setSettingsSaved(true);
    } catch (err) {
      setError('Could not save settings.');
    }
  };

  /* ---------- Derived values ---------- */

  const now = new Date();
  const todayStr = toDateString(now);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Name: from MongoDB, else Firebase/Google display name, else the start of the email
  const rawName =
    dbUser?.name ||
    auth.currentUser?.displayName ||
    (auth.currentUser?.email || '').split('@')[0];
  const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
  const firstName = displayName.split(' ')[0];

  const todayLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const examsThisWeek = exams.filter((e) => new Date(e.date) <= oneWeekFromNow).length;

  const todayEntries = (schedule?.entries || [])
    .filter((e) => e.date === todayStr)
    .sort((a, b) => (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1));
  const studyToday = todayEntries
    .filter((e) => e.type !== 'commitment')
    .reduce((sum, e) => sum + e.hours, 0);

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const nextExam = exams
    .filter((e) => new Date(e.date) >= startOfToday)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  let daysToExam = null;
  if (nextExam) {
    const examDay = new Date(nextExam.date);
    examDay.setHours(0, 0, 0, 0);
    daysToExam = Math.round((examDay - startOfToday) / (1000 * 60 * 60 * 24));
  }

  /* ---------- Render ---------- */

  return (
    <div className="db-page">
      <header className="db-header">
        <div className="db-logo">
          <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <path d="M40 65C29 55 17 53 5 55V13C19 10 31 15 40 25V65Z" stroke="#947A32" strokeWidth="2" />
            <path d="M40 65C51 55 63 53 75 55V13C61 10 49 15 40 25V65Z" fill="#59674A" />
            <path d="M40 65C29 58 17 57 5 59" stroke="#59674A" strokeWidth="2" />
            <path d="M40 65C51 58 63 57 75 59" stroke="#947A32" strokeWidth="2" />
          </svg>
          <div className="db-logo-text">
            Study<span>Nova</span>
          </div>
        </div>
        <div className="db-header-right">
          {displayName && <span className="db-user">{displayName}</span>}
          <button className="db-btn db-btn-ghost db-btn-small" onClick={() => signOut(auth)}>
            Log out
          </button>
        </div>
      </header>

      <nav className="db-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`db-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {scheduleLoading && <span className="db-updating">Updating schedule…</span>}
      </nav>

      <main className="db-main">
        {error && (
          <div className="db-error" role="alert">
            {error}
          </div>
        )}

        {/* ========== OVERVIEW ========== */}
        {tab === 'overview' && (
          <>
            <h1 className="db-greeting">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="db-subtle">{todayLabel}</p>

            <div className="db-stats">
              <div className="db-stat">
                <div className="db-stat-label">Study today</div>
                <div className="db-stat-value">{studyToday}h</div>
                <div className="db-stat-note">
                  {todayEntries.filter((e) => e.type !== 'commitment').length} session(s)
                </div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">Pending tasks</div>
                <div className="db-stat-value">{pending}</div>
                <div className="db-stat-note">{completed} completed</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">Upcoming exams</div>
                <div className="db-stat-value">{exams.length}</div>
                <div className="db-stat-note">{examsThisWeek} this week</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">Total tasks</div>
                <div className="db-stat-value">{tasks.length}</div>
                <div className="db-stat-note">all time</div>
              </div>
            </div>

            <div className="db-two-col">
              <div className="db-panel">
                <div className="db-panel-head">
                  <h2 className="db-section-title">Today's plan</h2>
                  <button className="db-btn db-btn-small" onClick={() => setTab('schedule')}>
                    Full schedule
                  </button>
                </div>
                {todayEntries.length === 0 && <p className="db-empty">Nothing scheduled for today.</p>}
                {todayEntries.map((entry, i) => (
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
                      <button className="db-btn db-btn-small" onClick={() => toggleSessionDone(entry)}>
                        {entry.completed ? 'Undo' : '✓ Done'}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="db-panel">
                <h2 className="db-section-title">Next exam</h2>
                {!nextExam && <p className="db-empty">No upcoming exams.</p>}
                {nextExam && (
                  <>
                    <div className="db-countdown">{daysToExam}</div>
                    <div className="db-countdown-label">{daysToExam === 1 ? 'day left' : 'days left'}</div>
                    <div className="db-exam-name">{nextExam.subject}</div>
                    <div className="db-subtle" style={{ margin: 0 }}>
                      {new Date(nextExam.date).toLocaleDateString('en-GB')} · {nextExam.difficulty} · ~
                      {nextExam.prepHoursNeeded}h prep
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ========== TASKS & EXAMS ========== */}
        {tab === 'work' && (
          <div className="db-two-col">
            <div className="db-panel">
              <h2 className="db-section-title">Tasks</h2>
              <form className="db-form" onSubmit={handleAddTask}>
                <input
                  className="db-input"
                  type="text"
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <div className="db-form-row">
                  <input
                    className="db-input"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />
                  <select className="db-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <input
                  className="db-input"
                  type="number"
                  min="1"
                  placeholder="Hours (optional — leave empty for AI estimate)"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                />
                <button type="submit" className="db-btn db-btn-primary" disabled={taskAdding || scheduleLoading}>
                  {taskAdding ? (durationHours === '' ? 'Estimating hours…' : 'Adding…') : 'Add task'}
                </button>
              </form>

              {tasks.length === 0 && <p className="db-empty">No tasks yet.</p>}
              {tasks.map((task) => (
                <TaskItem
                  key={task._id}
                  task={task}
                  disabled={scheduleLoading}
                  onToggle={toggleComplete}
                  onSave={saveTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>

            <div className="db-panel">
              <h2 className="db-section-title">Exams</h2>
              <form className="db-form" onSubmit={handleAddExam}>
                <input
                  className="db-input"
                  type="text"
                  placeholder="Subject"
                  value={examSubject}
                  onChange={(e) => setExamSubject(e.target.value)}
                  required
                />
                <div className="db-form-row">
                  <input
                    className="db-input"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    required
                  />
                  <select
                    className="db-select"
                    value={examDifficulty}
                    onChange={(e) => setExamDifficulty(e.target.value)}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <button type="submit" className="db-btn db-btn-primary" disabled={scheduleLoading}>
                  Add exam
                </button>
              </form>

              {exams.length === 0 && <p className="db-empty">No exams yet.</p>}
              {exams.map((exam) => (
                <ExamItem
                  key={exam._id}
                  exam={exam}
                  disabled={scheduleLoading}
                  onSave={saveExam}
                  onDelete={deleteExam}
                />
              ))}
            </div>
          </div>
        )}

        {/* ========== SCHEDULE ========== */}
        {tab === 'schedule' && (
          <div className="db-panel">
            <div className="db-panel-head">
              <h2 className="db-section-title">Your schedule</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="db-toggle">
                  <button
                    className={scheduleView === 'week' ? 'active' : ''}
                    onClick={() => setScheduleView('week')}
                  >
                    Week
                  </button>
                  <button
                    className={scheduleView === 'list' ? 'active' : ''}
                    onClick={() => setScheduleView('list')}
                  >
                    List
                  </button>
                </div>
                <button className="db-btn db-btn-primary" onClick={generateSchedule} disabled={scheduleLoading}>
                  {scheduleLoading ? 'Updating…' : 'Regenerate with AI'}
                </button>
              </div>
            </div>

            {schedule?.isOverloaded && (
              <div className="db-error">
                Overload detected on {schedule.overloadedDays.length} day(s). Consider moving a deadline or
                freeing up time in Settings.
              </div>
            )}

            {!schedule?.entries && (
              <p className="db-empty">No schedule yet. Add tasks or exams, or click Regenerate with AI.</p>
            )}

            {schedule?.entries &&
              (scheduleView === 'week' ? (
                <WeekCalendar entries={schedule.entries} onToggle={toggleSessionDone} />
              ) : (
                <ScheduleList entries={schedule.entries} onToggle={toggleSessionDone} />
              ))}
          </div>
        )}

        {/* ========== ANALYTICS ========== */}
        {tab === 'analytics' && <Analytics tasks={tasks} schedule={schedule} />}

        {/* ========== SETTINGS ========== */}
        {tab === 'settings' && (
          <div className="db-panel">
            <h2 className="db-section-title">Weekly routine</h2>
            <p className="db-subtle">Used to calculate your real free study hours each day.</p>

            <div className="db-form-row" style={{ maxWidth: 360, marginBottom: 24 }}>
              <div className="db-field">
                <label htmlFor="sleep-time">Sleep time (24h)</label>
                <input
                  id="sleep-time"
                  className="db-input"
                  type="number"
                  min="0"
                  max="23"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                />
              </div>
              <div className="db-field">
                <label htmlFor="wake-time">Wake time (24h)</label>
                <input
                  id="wake-time"
                  className="db-input"
                  type="number"
                  min="0"
                  max="23"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                />
              </div>
            </div>

            <h3 className="db-section-title" style={{ fontSize: 17 }}>
              Recurring commitments
            </h3>
            {commitments.length === 0 && <p className="db-empty">None added yet.</p>}
            {commitments.map((c, i) => (
              <div key={i} className="db-commitment-row">
                <span>
                  <strong>{c.day}</strong> — {c.label} ({c.startHour}:00–{c.endHour}:00)
                </span>
                <button className="db-btn db-btn-small db-btn-danger" onClick={() => removeCommitment(i)}>
                  Remove
                </button>
              </div>
            ))}

            <div className="db-commitment-add">
              <div className="db-field">
                <label htmlFor="c-day">Day</label>
                <select
                  id="c-day"
                  className="db-select"
                  value={newCommitmentDay}
                  onChange={(e) => setNewCommitmentDay(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="db-field">
                <label htmlFor="c-label">Label</label>
                <input
                  id="c-label"
                  className="db-input"
                  type="text"
                  placeholder="Gym"
                  value={newCommitmentLabel}
                  onChange={(e) => setNewCommitmentLabel(e.target.value)}
                />
              </div>
              <div className="db-field">
                <label htmlFor="c-start">Start</label>
                <input
                  id="c-start"
                  className="db-input db-input-small"
                  type="number"
                  min="0"
                  max="23"
                  value={newCommitmentStart}
                  onChange={(e) => setNewCommitmentStart(e.target.value)}
                />
              </div>
              <div className="db-field">
                <label htmlFor="c-end">End</label>
                <input
                  id="c-end"
                  className="db-input db-input-small"
                  type="number"
                  min="0"
                  max="23"
                  value={newCommitmentEnd}
                  onChange={(e) => setNewCommitmentEnd(e.target.value)}
                />
              </div>
              <button className="db-btn" onClick={addCommitment}>
                Add
              </button>
            </div>

            <button
              className="db-btn db-btn-primary"
              onClick={saveSettings}
              style={{ marginTop: 24, width: '100%' }}
            >
              Save settings
            </button>
            {settingsSaved && <p className="db-success">Settings saved.</p>}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;