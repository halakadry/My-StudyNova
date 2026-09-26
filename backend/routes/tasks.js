const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const calculatePriorityScore = require('../utils/priorityScore');
const { estimateTaskHours } = require('../services/geminiService');

// Create a task
router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If no hours were given, let the AI estimate them (falls back to defaults if AI fails)
    let durationHours = Number(req.body.durationHours);
    let hoursEstimated = false;
    if (!durationHours || durationHours <= 0) {
      durationHours = await estimateTaskHours(req.body.title, req.body.difficulty);
      hoursEstimated = true;
    }

    const taskData = { ...req.body, durationHours, hoursEstimated };
    const priorityScore = calculatePriorityScore(taskData, user.availableHoursPerDay || 4);

    const task = await Task.create({ ...taskData, priorityScore });
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

// Update a task (status, or edit title/deadline/difficulty/hours)
router.put('/:id', async (req, res) => {
  try {
    const existing = await Task.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const updates = { ...req.body };

    // User changed the hours by hand -> no longer an AI estimate
    if (updates.durationHours !== undefined && Number(updates.durationHours) !== existing.durationHours) {
      updates.durationHours = Number(updates.durationHours);
      updates.hoursEstimated = false;
    }

    // Recalculate priority if anything in the formula changed
    if (updates.deadline || updates.difficulty || updates.durationHours !== undefined) {
      const user = await User.findById(existing.userId);
      const merged = { ...existing.toObject(), ...updates };
      updates.priorityScore = calculatePriorityScore(merged, user?.availableHoursPerDay || 4);
    }

    const task = await Task.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;