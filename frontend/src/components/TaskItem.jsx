import { useState } from 'react';

function TaskItem({ task, disabled, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm({
      title: task.title,
      deadline: task.deadline.slice(0, 10),
      difficulty: task.difficulty,
      durationHours: task.durationHours,
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(task._id, { ...form, durationHours: Number(form.durationHours) });
      setEditing(false);
    } catch (err) {
      alert('Could not save task.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="db-item db-item-edit">
        <input
          className="db-input"
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="db-form-row" style={{ margin: '8px 0' }}>
          <input
            className="db-input"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
          <select
            className="db-select"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <input
            className="db-input"
            type="number"
            min="1"
            value={form.durationHours}
            onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
            aria-label="Hours"
          />
        </div>
        <div className="db-item-actions">
          <button className="db-btn db-btn-primary db-btn-small" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="db-btn db-btn-small" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';

  return (
    <div className={`db-item ${isCompleted ? 'completed' : ''}`}>
      <div>
        <div className="db-item-title">{task.title}</div>
        <div className="db-item-meta">
          Due {new Date(task.deadline).toLocaleDateString('en-GB')} · {task.difficulty} · {task.durationHours}h
          {task.hoursEstimated && <span className="db-ai-tag"> · AI est.</span>}
        </div>
      </div>
      <div className="db-item-actions">
        <button className="db-btn db-btn-small" onClick={() => onToggle(task)} disabled={disabled}>
          {isCompleted ? 'Reopen' : '✓ Done'}
        </button>
        <button className="db-btn db-btn-small" onClick={startEdit} disabled={disabled}>
          Edit
        </button>
        <button className="db-btn db-btn-small db-btn-danger" onClick={() => onDelete(task._id)} disabled={disabled}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default TaskItem;