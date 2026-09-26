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

  const boxStyle = { border: '1px solid #eee', borderRadius: 6, padding: 10, marginBottom: 8 };

  if (editing) {
    return (
      <div style={boxStyle}>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          style={{ width: '100%', padding: 6, marginBottom: 6 }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ flex: 1, padding: 6 }}
          />
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            style={{ padding: 6 }}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <input
            type="number"
            min="1"
            value={form.prepHoursNeeded}
            onChange={(e) => setForm({ ...form, prepHoursNeeded: e.target.value })}
            style={{ width: 60, padding: 6 }}
          />
          <span style={{ alignSelf: 'center', fontSize: 12 }}>h prep</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={save} disabled={saving} style={{ padding: '4px 10px' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} disabled={saving} style={{ padding: '4px 10px' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong>{exam.subject}</strong>
        <div style={{ fontSize: 12, color: '#666' }}>
          {new Date(exam.date).toLocaleDateString()} · {exam.difficulty} · ~{exam.prepHoursNeeded}h prep
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={startEdit} disabled={disabled} style={{ padding: '4px 8px' }}>
          Edit
        </button>
        <button onClick={() => onDelete(exam._id)} disabled={disabled} style={{ padding: '4px 8px' }}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default ExamItem;