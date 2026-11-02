const express = require('express');
const router = express.Router();
const User = require('../models/User');

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

// Update settings (sleep, wake, commitments) - only your own profile
router.put('/:id/settings', async (req, res) => {
  try {
    if (!req.user || String(req.user._id) !== req.params.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { sleepTime, wakeTime, recurringCommitments, availableHoursPerDay, constraints } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { sleepTime, wakeTime, recurringCommitments, availableHoursPerDay, constraints },
      { returnDocument: 'after' }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;