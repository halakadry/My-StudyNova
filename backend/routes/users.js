const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create or update a user (call this after Firebase sign-up/login)
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, name, email, availableHoursPerDay, constraints } = req.body;
    let user = await User.findOne({ firebaseUid });
    if (user) {
      user.name = name ?? user.name;
      user.availableHoursPerDay = availableHoursPerDay ?? user.availableHoursPerDay;
      user.constraints = constraints ?? user.constraints;
      await user.save();
    } else {
      user = await User.create({ firebaseUid, name, email, availableHoursPerDay, constraints });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a user by firebaseUid
router.get('/:firebaseUid', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;