const express = require('express');
const router = express.Router();
const User = require('../models/User');

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Keeps only valid, upcoming one-time events, sorted by date and time
function cleanEvents(events) {
  const today = todayString();
  return (Array.isArray(events) ? events : [])
    .map((e) => ({
      date: String(e.date || ''),
      label: String(e.label || '').trim().slice(0, 60),
      startHour: Math.round(Number(e.startHour)),
      endHour: Math.round(Number(e.endHour)),
    }))
    .filter(
      (e) =>
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        e.date >= today &&
        e.label &&
        e.startHour >= 0 &&
        e.endHour <= 24 &&
        e.startHour < e.endHour
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour)
    .slice(0, 100);
}

// Create or update the logged-in user's profile (called after Firebase sign-up/login).
// The Firebase ID always comes from the verified login token, never from the browser.
router.post('/', async (req, res) => {
  try {
    const firebaseUid = req.firebaseUser.uid;
    const { name, availableHoursPerDay, constraints, sleepTime, wakeTime, recurringCommitments } = req.body;
    const email = req.firebaseUser.email || req.body.email;

    let user = await User.findOne({ firebaseUid });
    if (user) {
      if (name) user.name = name; // an empty name from login never erases a saved name
      user.availableHoursPerDay = availableHoursPerDay ?? user.availableHoursPerDay;
      user.constraints = constraints ?? user.constraints;
      user.sleepTime = sleepTime ?? user.sleepTime;
      user.wakeTime = wakeTime ?? user.wakeTime;
      user.recurringCommitments = recurringCommitments ?? user.recurringCommitments;
      await user.save();
    } else {
      user = await User.create({ firebaseUid, name, email, availableHoursPerDay, constraints, sleepTime, wakeTime, recurringCommitments });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the logged-in user's profile (only your own)
router.get('/:firebaseUid', async (req, res) => {
  try {
    if (req.params.firebaseUid !== req.firebaseUser.uid) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (!req.user) return res.status(404).json({ error: 'User not found' });
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings - only your own profile, and only the fields that were sent
router.put('/:id/settings', async (req, res) => {
  try {
    if (!req.user || String(req.user._id) !== req.params.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const allowed = ['sleepTime', 'wakeTime', 'recurringCommitments', 'availableHoursPerDay', 'constraints', 'oneTimeEvents'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    if (updates.oneTimeEvents) updates.oneTimeEvents = cleanEvents(updates.oneTimeEvents);

    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;