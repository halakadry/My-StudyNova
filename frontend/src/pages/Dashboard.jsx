import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import api from '../services/api';

function Dashboard({ dbUser }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [durationHours, setDurationHours] = useState('');
  const [error, setError] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/user/${dbUser._id}`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (dbUser?._id) fetchTasks();
  }, [dbUser]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/tasks', {
        userId: dbUser._id,
        title,
        deadline,
        difficulty,
        durationHours: Number(durationHours),
      });
      setTitle('');
      setDeadline('');
      setDifficulty('Easy');
      setDurationHours('');
      fetchTasks();
    } catch (err) {
      setError('Could not add task.');
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

  const totalTasks = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const pending = tasks.filter((t) => t.status === 'pending').length;

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
          <h2>0</h2>
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
                placeholder="Estimated hours"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                required
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: 10 }}>
              Add task
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
                </div>
              </div>
              <button onClick={() => toggleComplete(task)} style={{ padding: '4px 8px' }}>
                {task.status === 'completed' ? 'Completed' : 'Mark done'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;