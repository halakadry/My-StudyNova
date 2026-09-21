const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const calculatePriorityScore = require('../utils/priorityScore');

// Create a task
router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const priorityScore = calculatePriorityScore(req.body, user.availableHoursPerDay || 4);

    const task = await Task.create({ ...req.body, priorityScore });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tasks for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task
// Update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // If status changed, trigger re-scheduling
    if (req.body.status) {
      const { buildAndSaveSchedule } = require('../routes/schedule');
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;