import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';
import Analytics from '../components/Analytics';
import ScheduleList from '../components/ScheduleList';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Dashboard({ dbUser }) {
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

  const [sleepTime, setSleepTime] = useState(23);
  const [wakeTime, setWakeTime] = useState(8);
  const [commitments, setCommitments] = useState([]);
  const [newCommitmentDay, setNewCommitmentDay] = useState('Monday');
  const [newCommitmentLabel, setNewCommitmentLabel] = useState('');
  const [newCommitmentStart, setNewCommitmentStart] = useState('');
  const [newCommitmentEnd, setNewCommitmentEnd] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

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
        // Empty = let the AI estimate the hours
        durationHours: durationHours === '' ? null : Number(durationHours),
      });
      setTitle('');
      setDeadline('');
      setDifficulty('Easy');
      setDurationHours('');
      fetchTasks();
    } catch (err) {
      setError('Could not add task.');
    } finally {
      setTaskAdding(false);
    }
  };

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
    } catch (err) {
      setError('Could not add exam.');
    }
  };

  const deleteExam = async (examId) => {
    try {
      await api.delete(`/exams/${examId}`);
      fetchExams();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComplete = async (task) => {
    try {
      await api.put(`/tasks/${task._id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const generateSchedule = async () => {
    setScheduleLoading(true);
    setError('');
    try {
      const res = await api.post('/schedule/generate', { userId: dbUser._id });
      setSchedule(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not generate schedule.');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Mark a single study session as done / not done
  const toggleSessionDone = async (entry) => {
    try {
      const res = await api.patch(`/schedule/entry/${entry._id}/toggle`);
      setSchedule(res.data);
    } catch (err) {
      console.error(err);
      setError('Could not update session. Try clicking Generate AI Schedule once.');
    }
  };

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

  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  const examsThisWeek = exams.filter((e) => new Date(e.date) <= oneWeekFromNow).length;

  const cardStyle = { border: '1px solid #ddd', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' };

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>StudyNova</h1>
        <button onClick={() => signOut(auth)} style={{ padding: '6px 12px' }}>
          Log out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, margin: '1.5rem 0' }}>
        <div style={cardStyle}>
          <div>Total tasks</div>
          <h2>{totalTasks}</h2>
        </div>
        <div style={cardStyle}>
          <div>Completed</div>
          <h2>{completed}</h2>
        </div>
        <div style={cardStyle}>
          <div>Pending</div>
          <h2>{pending}</h2>
        </div>
        <div style={cardStyle}>
          <div>Exams this week</div>
          <h2>{examsThisWeek}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>Add new task</h3>
          <form onSubmit={handleAddTask}>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={{ width: '100%', padding: 8 }}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                type="number"
                min="1"
                placeholder="Estimated hours (optional — leave empty for AI estimate)"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" disabled={taskAdding} style={{ width: '100%', padding: 10 }}>
              {taskAdding ? (durationHours === '' ? 'Estimating hours...' : 'Adding...') : 'Add task'}
            </button>
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <h3>My tasks</h3>
          {tasks.length === 0 && <p>No tasks yet.</p>}
          {tasks.map((task) => (
            <div
              key={task._id}
              style={{
                border: '1px solid #eee',
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{task.title}</strong>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Due {new Date(task.deadline).toLocaleDateString()} · {task.difficulty} · {task.durationHours}h
                  {task.hoursEstimated && <span style={{ color: '#2f6fbf' }}> (AI est.)</span>}
                </div>
              </div>
              <button onClick={() => toggleComplete(task)} style={{ padding: '4px 8px' }}>
                {task.status === 'completed' ? 'Completed' : 'Mark done'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
        <div style={{ flex: 1 }}>
          <h3>Add new exam</h3>
          <form onSubmit={handleAddExam}>
            <div style={{ marginBottom: 8 }}>
              <input
                type="text"
                placeholder="Subject"
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value)}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <select
                value={examDifficulty}
                onChange={(e) => setExamDifficulty(e.target.value)}
                style={{ width: '100%', padding: 8 }}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <button type="submit" style={{ width: '100%', padding: 10 }}>
              Add exam
            </button>
          </form>
        </div>

        <div style={{ flex: 1 }}>
          <h3>My exams</h3>
          {exams.length === 0 && <p>No exams yet.</p>}
          {exams.map((exam) => (
            <div
              key={exam._id}
              style={{
                border: '1px solid #eee',
                borderRadius: 6,
                padding: 10,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{exam.subject}</strong>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {new Date(exam.date).toLocaleDateString()} · {exam.difficulty} · ~{exam.prepHoursNeeded}h prep
                </div>
              </div>
              <button onClick={() => deleteExam(exam._id)} style={{ padding: '4px 8px' }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 32, border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3>Weekly Routine Settings</h3>
        <p style={{ fontSize: 13, color: '#666' }}>
          Used to calculate your real free study hours each day.
        </p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Sleep time (24h, e.g. 23)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={sleepTime}
              onChange={(e) => setSleepTime(e.target.value)}
              style={{ padding: 8, width: 100 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Wake time (24h, e.g. 8)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              style={{ padding: 8, width: 100 }}
            />
          </div>
        </div>

        <h4>Recurring commitments (gym, classes, work shifts...)</h4>
        {commitments.length === 0 && <p style={{ fontSize: 13, color: '#999' }}>None added yet.</p>}
        {commitments.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span>
              {c.day} — {c.label} ({c.startHour}:00–{c.endHour}:00)
            </span>
            <button onClick={() => removeCommitment(i)} style={{ padding: '2px 8px' }}>
              Remove
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12 }}>Day</label>
            <select
              value={newCommitmentDay}
              onChange={(e) => setNewCommitmentDay(e.target.value)}
              style={{ padding: 6 }}
            >
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12 }}>Label</label>
            <input
              type="text"
              placeholder="Gym"
              value={newCommitmentLabel}
              onChange={(e) => setNewCommitmentLabel(e.target.value)}
              style={{ padding: 6, width: 100 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12 }}>Start hour</label>
            <input
              type="number"
              min="0"
              max="23"
              value={newCommitmentStart}
              onChange={(e) => setNewCommitmentStart(e.target.value)}
              style={{ padding: 6, width: 70 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12 }}>End hour</label>
            <input
              type="number"
              min="0"
              max="23"
              value={newCommitmentEnd}
              onChange={(e) => setNewCommitmentEnd(e.target.value)}
              style={{ padding: 6, width: 70 }}
            />
          </div>
          <button onClick={addCommitment} style={{ padding: 8 }}>
            Add
          </button>
        </div>

        <button onClick={saveSettings} style={{ marginTop: 16, padding: 10, width: '100%' }}>
          Save Settings
        </button>
        {settingsSaved && <p style={{ color: 'green', marginTop: 8 }}>Settings saved.</p>}
      </div>

      <Analytics tasks={tasks} schedule={schedule} />

      <div style={{ marginTop: 24 }}>
        <button onClick={generateSchedule} disabled={scheduleLoading} style={{ padding: 10 }}>
          {scheduleLoading ? 'Generating...' : 'Generate AI Schedule'}
        </button>

        {schedule?.isOverloaded && (
          <p style={{ color: 'orange', marginTop: 8 }}>
            ⚠️ Overload detected on {schedule.overloadedDays.length} day(s).
          </p>
        )}

        {schedule?.entries && (
          <div style={{ marginTop: 12 }}>
            <h3>Your Schedule</h3>
            <ScheduleList entries={schedule.entries} onToggle={toggleSessionDone} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;