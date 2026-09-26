import { useState } from 'react';

function ExamItem({ exam, disabled, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm({
      subject: exam.subject,
      date: exam.date.slice(0, 10),
      difficulty: exam.difficulty,
      prepHoursNeeded: exam.prepHoursNeeded,
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(exam._id, { ...form, prepHoursNeeded: Number(form.prepHoursNeeded) });
      setEditing(false);
    } catch (err) {
      alert('Could not save exam.');
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
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <div className="db-form-row" style={{ margin: '8px 0' }}>
          <input
            className="db-input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
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
            value={form.prepHoursNeeded}
            onChange={(e) => setForm({ ...form, prepHoursNeeded: e.target.value })}
            aria-label="Prep hours"
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

  return (
    <div className="db-item">
      <div>
        <div className="db-item-title" style={{ textTransform: 'capitalize' }}>
          {exam.subject}
        </div>
        <div className="db-item-meta">
          {new Date(exam.date).toLocaleDateString('en-GB')} · {exam.difficulty} · ~{exam.prepHoursNeeded}h prep
        </div>
      </div>
      <div className="db-item-actions">
        <button className="db-btn db-btn-small" onClick={startEdit} disabled={disabled}>
          Edit
        </button>
        <button className="db-btn db-btn-small db-btn-danger" onClick={() => onDelete(exam._id)} disabled={disabled}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default ExamItem;