import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';
import Analytics from '../components/Analytics';
import ScheduleList from '../components/ScheduleList';
import WeekCalendar from '../components/WeekCalendar';
import TaskItem from '../components/TaskItem';
import ExamItem from '../components/ExamItem';
import ChatAssistant from '../components/ChatAssistant';
import Summarizer from '../components/Summarizer';
import LanguageMenu from '../components/LanguageMenu';
import SupportModal from '../components/SupportModal';
import { useLanguage } from '../i18n/useLanguage';
import './Dashboard.css';

// Day values stay in English (the backend uses them); only the labels are translated
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TAB_IDS = ['overview', 'work', 'schedule', 'analytics', 'assistant', 'summarize', 'settings'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function Dashboard({ dbUser }) {
  const { t, lang, dir, locale } = useLanguage();
  const [tab, setTab] = useState('overview');

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportPrefill, setSupportPrefill] = useState('');

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

  // Day name in the chosen language (Jan 1 2023 was a Sunday)
  const dayLabel = (day) =>
    new Date(2023, 0, 1 + DAYS.indexOf(day)).toLocaleDateString(locale, { weekday: 'long' });

  const openSupport = (prefillText = '') => {
    setSupportPrefill(prefillText);
    setSupportOpen(true);
  };

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

  // Load the saved schedule. If it was last built before today, rebuild it so missed work moves forward.
  const fetchSchedule = async (allowAutoRefresh = true) => {
    try {
      const res = await api.get(`/schedule/${dbUser._id}`);
      setSchedule(res.data);
      const builtOn = toDateString(new Date(res.data.updatedAt));
      if (allowAutoRefresh && builtOn < toDateString(new Date())) {
        refreshSchedule();
      }
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
      await fetchSchedule(false);
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
      setError(t('errAddTask'));
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
    if (!window.confirm(t('confirmDeleteTask'))) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      refreshSchedule();
    } catch (err) {
      setError(t('errDeleteTask'));
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
      setError(t('errAddExam'));
    }
  };

  const saveExam = async (examId, updates) => {
    await api.put(`/exams/${examId}`, updates);
    fetchExams();
    refreshSchedule();
  };

  const deleteExam = async (examId) => {
    if (!window.confirm(t('confirmDeleteExam'))) return;
    try {
      await api.delete(`/exams/${examId}`);
      fetchExams();
      refreshSchedule();
    } catch (err) {
      console.error(err);
    }
  };
  /* ---------- Summary → study plan ---------- */

  // Adds a summarized lecture's study hours to an exam's prep
  const addLectureToExam = async (examId, hours) => {
    const exam = exams.find((e) => e._id === examId);
    if (!exam) throw new Error('Exam not found');
    await api.put(`/exams/${examId}`, { prepHoursNeeded: (exam.prepHoursNeeded || 0) + hours });
    fetchExams();
    refreshSchedule();
  };

  // Creates a study task from a summarized lecture
  const createTaskFromSummary = async ({ title: taskTitle, deadline: taskDeadline, difficulty: taskDifficulty, hours }) => {
    await api.post('/tasks', {
      userId: dbUser._id,
      title: taskTitle,
      deadline: taskDeadline,
      difficulty: taskDifficulty,
      durationHours: hours,
    });
    fetchTasks();
    refreshSchedule();
  };
  /* ---------- Schedule ---------- */

  const generateSchedule = async () => {
    setScheduleLoading(true);
    setError('');
    try {
      const res = await api.post('/schedule/generate', { userId: dbUser._id });
      setSchedule(res.data);
    } catch (err) {
      setError(t('errGenerate'));
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleSessionDone = async (entry) => {
    try {
      const res = await api.patch(`/schedule/entry/${entry._id}/toggle`);
      setSchedule(res.data);
    } catch (err) {
      setError(t('errSession'));
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
      setError(t('errSaveSettings'));
    }
  };

  /* ---------- Derived values ---------- */

  const now = new Date();
  const todayStr = toDateString(now);
  const hour = now.getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');

  // Name: from MongoDB, else Firebase/Google display name, else the start of the email
  const rawName =
    dbUser?.name ||
    auth.currentUser?.displayName ||
    (auth.currentUser?.email || '').split('@')[0];
  const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
  const firstName = displayName.split(' ')[0];

  const todayLabel = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const completed = tasks.filter((tk) => tk.status === 'completed').length;
  const pending = tasks.filter((tk) => tk.status === 'pending').length;

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
    <div className="db-page" dir={dir} lang={lang}>
      <header className="db-header">
        <div className="db-logo">
          <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
            <path d="M40 65C29 55 17 53 5 55V13C19 10 31 15 40 25V65Z" stroke="#947A32" strokeWidth="2" />
            <path d="M40 65C51 55 63 53 75 55V13C61 10 49 15 40 25V65Z" fill="#59674A" />
            <path d="M40 65C29 58 17 57 5 59" stroke="#59674A" strokeWidth="2" />
            <path d="M40 65C51 58 63 57 75 59" stroke="#947A32" strokeWidth="2" />
          </svg>
          <div className="db-logo-text" dir="ltr">
            Study<span>Nova</span>
          </div>
        </div>
        <div className="db-header-right">
          <button type="button" className="db-pill-btn" onClick={() => openSupport()}>
            <MailIcon />
            {t('contactSupport')}
          </button>
          <LanguageMenu />
          {displayName && <span className="db-user">{displayName}</span>}
          <button className="db-btn db-btn-ghost db-btn-small" onClick={() => signOut(auth)}>
            {t('logOut')}
          </button>
        </div>
      </header>

      <nav className="db-tabs">
        {TAB_IDS.map((id) => (
          <button key={id} className={`db-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            {t(id)}
          </button>
        ))}
        {scheduleLoading && <span className="db-updating">{t('updatingSchedule')}</span>}
      </nav>

      <main className="db-main">
        {error && (
          <div className="db-error db-error-row" role="alert">
            <span>{error}</span>
            <button type="button" className="db-btn db-btn-small" onClick={() => openSupport(error)}>
              {t('reportThis')}
            </button>
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
                <div className="db-stat-label">{t('studyToday')}</div>
                <div className="db-stat-value">{t('hours', { n: studyToday })}</div>
                <div className="db-stat-note">
                  {t('sessionsCount', { n: todayEntries.filter((e) => e.type !== 'commitment').length })}
                </div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">{t('pendingTasks')}</div>
                <div className="db-stat-value">{pending}</div>
                <div className="db-stat-note">{t('completedCount', { n: completed })}</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">{t('upcomingExams')}</div>
                <div className="db-stat-value">{exams.length}</div>
                <div className="db-stat-note">{t('thisWeekCount', { n: examsThisWeek })}</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-label">{t('totalTasks')}</div>
                <div className="db-stat-value">{tasks.length}</div>
                <div className="db-stat-note">{t('allTime')}</div>
              </div>
            </div>

            <div className="db-two-col">
              <div className="db-panel">
                <div className="db-panel-head">
                  <h2 className="db-section-title">{t('todaysPlan')}</h2>
                  <button className="db-btn db-btn-small" onClick={() => setTab('schedule')}>
                    {t('fullSchedule')}
                  </button>
                </div>
                {todayEntries.length === 0 && <p className="db-empty">{t('nothingToday')}</p>}
                {todayEntries.map((entry, i) => (
                  <div
                    key={entry._id || i}
                    className={`db-row ${entry.type === 'commitment' ? 'commitment' : 'study'} ${
                      entry.completed ? 'done' : ''
                    }`}
                  >
                    <span className="db-row-text" dir="auto">
                      {entry.type === 'commitment'
                        ? `${entry.task} · ${entry.startHour}:00–${entry.endHour}:00`
                        : `${entry.task} · ${t('hours', { n: entry.hours })}`}
                    </span>
                    {entry.type !== 'commitment' && (
                      <button className="db-btn db-btn-small" onClick={() => toggleSessionDone(entry)}>
                        {entry.completed ? t('undo') : t('markDoneBtn')}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="db-panel">
                <h2 className="db-section-title">{t('nextExam')}</h2>
                {!nextExam && <p className="db-empty">{t('noUpcomingExams')}</p>}
                {nextExam && (
                  <>
                    <div className="db-countdown">{daysToExam}</div>
                    <div className="db-countdown-label">{daysToExam === 1 ? t('dayLeft') : t('daysLeft')}</div>
                    <div className="db-exam-name" dir="auto">
                      {nextExam.subject}
                    </div>
                    <div className="db-subtle" style={{ margin: 0 }}>
                      {new Date(nextExam.date).toLocaleDateString(locale)} · {t(nextExam.difficulty)} ·{' '}
                      {t('prepHours', { n: nextExam.prepHoursNeeded })}
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
              <h2 className="db-section-title">{t('tasks')}</h2>
              <form className="db-form" onSubmit={handleAddTask}>
                <input
                  className="db-input"
                  type="text"
                  dir="auto"
                  placeholder={t('taskTitle')}
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
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {t(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="db-input"
                  type="number"
                  min="1"
                  placeholder={t('hoursOptional')}
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                />
                <button type="submit" className="db-btn db-btn-primary" disabled={taskAdding || scheduleLoading}>
                  {taskAdding ? (durationHours === '' ? t('estimatingHours') : t('adding')) : t('addTask')}
                </button>
              </form>

              {tasks.length === 0 && <p className="db-empty">{t('noTasks')}</p>}
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
              <h2 className="db-section-title">{t('exams')}</h2>
              <form className="db-form" onSubmit={handleAddExam}>
                <input
                  className="db-input"
                  type="text"
                  dir="auto"
                  placeholder={t('subject')}
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
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {t(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="db-btn db-btn-primary" disabled={scheduleLoading}>
                  {t('addExam')}
                </button>
              </form>

              {exams.length === 0 && <p className="db-empty">{t('noExams')}</p>}
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
              <h2 className="db-section-title">{t('yourSchedule')}</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="db-toggle">
                  <button
                    className={scheduleView === 'week' ? 'active' : ''}
                    onClick={() => setScheduleView('week')}
                  >
                    {t('week')}
                  </button>
                  <button
                    className={scheduleView === 'list' ? 'active' : ''}
                    onClick={() => setScheduleView('list')}
                  >
                    {t('list')}
                  </button>
                </div>
                <button className="db-btn db-btn-primary" onClick={generateSchedule} disabled={scheduleLoading}>
                  {scheduleLoading ? t('updating') : t('regenerate')}
                </button>
              </div>
            </div>

            {schedule?.isOverloaded && (
              <div className="db-error">{t('overload', { n: schedule.overloadedDays.length })}</div>
            )}

            {!schedule?.entries && <p className="db-empty">{t('noSchedule')}</p>}

            {schedule?.entries &&
              (scheduleView === 'week' ? (
                <WeekCalendar entries={schedule.entries} onToggle={toggleSessionDone} />
              ) : (
                <ScheduleList entries={schedule.entries} onToggle={toggleSessionDone} />
              ))}
          </div>
        )}

        {/* ========== ASSISTANT + SUMMARIZER (stay mounted so nothing is lost when switching tabs) ========== */}
        <div style={{ display: tab === 'assistant' ? 'block' : 'none' }}>
          <ChatAssistant userId={dbUser._id} />
        </div>

        <div style={{ display: tab === 'summarize' ? 'block' : 'none' }}>
          <Summarizer exams={exams} onAddToExam={addLectureToExam} onCreateTask={createTaskFromSummary} />        </div>

        {/* ========== ANALYTICS ========== */}
        {tab === 'analytics' && <Analytics tasks={tasks} schedule={schedule} />}

        {/* ========== SETTINGS ========== */}
        {tab === 'settings' && (
          <div className="db-panel">
            <h2 className="db-section-title">{t('weeklyRoutine')}</h2>
            <p className="db-subtle">{t('routineHint')}</p>

            <div className="db-form-row" style={{ maxWidth: 360, marginBottom: 24 }}>
              <div className="db-field">
                <label htmlFor="sleep-time">{t('sleepTime')}</label>
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
                <label htmlFor="wake-time">{t('wakeTime')}</label>
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
              {t('recurring')}
            </h3>
            {commitments.length === 0 && <p className="db-empty">{t('noneYet')}</p>}
            {commitments.map((c, i) => (
              <div key={i} className="db-commitment-row">
                <span dir="auto">
                  <strong>{dayLabel(c.day)}</strong> — {c.label} ({c.startHour}:00–{c.endHour}:00)
                </span>
                <button className="db-btn db-btn-small db-btn-danger" onClick={() => removeCommitment(i)}>
                  {t('remove')}
                </button>
              </div>
            ))}

            <div className="db-commitment-add">
              <div className="db-field">
                <label htmlFor="c-day">{t('day')}</label>
                <select
                  id="c-day"
                  className="db-select"
                  value={newCommitmentDay}
                  onChange={(e) => setNewCommitmentDay(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {dayLabel(d)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="db-field">
                <label htmlFor="c-label">{t('label')}</label>
                <input
                  id="c-label"
                  className="db-input"
                  type="text"
                  dir="auto"
                  placeholder={t('gymPlaceholder')}
                  value={newCommitmentLabel}
                  onChange={(e) => setNewCommitmentLabel(e.target.value)}
                />
              </div>
              <div className="db-field">
                <label htmlFor="c-start">{t('start')}</label>
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
                <label htmlFor="c-end">{t('end')}</label>
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
                {t('add')}
              </button>
            </div>

            <button
              className="db-btn db-btn-primary"
              onClick={saveSettings}
              style={{ marginTop: 24, width: '100%' }}
            >
              {t('saveSettings')}
            </button>
            {settingsSaved && <p className="db-success">{t('settingsSaved')}</p>}
          </div>
        )}
      </main>

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        prefill={supportPrefill}
        userId={dbUser._id}
        page={tab}
      />
    </div>
  );
}

export default Dashboard;