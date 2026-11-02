const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const calculatePriorityScore = require('../utils/priorityScore');
const { estimateTaskHours } = require('../services/geminiService');

// req.user = the logged-in user (set in server.js). Every query is limited to their own tasks.

// Create a task
router.post('/', async (req, res) => {
  try {
    const user = req.user;

    // If no hours were given, let the AI estimate them (falls back to defaults if AI fails)
    let durationHours = Number(req.body.durationHours);
    let hoursEstimated = false;
    if (!durationHours || durationHours <= 0) {
      durationHours = await estimateTaskHours(req.body.title, req.body.difficulty);
      hoursEstimated = true;
    }

    const taskData = {
      title: req.body.title,
      deadline: req.body.deadline,
      difficulty: req.body.difficulty,
      userId: user._id,
      durationHours,
      hoursEstimated,
    };
    const priorityScore = calculatePriorityScore(taskData, user.availableHoursPerDay || 4);

    const task = await Task.create({ ...taskData, priorityScore });
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the logged-in user's tasks
router.get('/user/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task (status, or edit title/deadline/difficulty/hours)
router.put('/:id', async (req, res) => {
  try {
    const existing = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const { userId, priorityScore, ...updates } = req.body; // never let the browser change these

    // User changed the hours by hand -> no longer an AI estimate
    if (updates.durationHours !== undefined && Number(updates.durationHours) !== existing.durationHours) {
      updates.durationHours = Number(updates.durationHours);
      updates.hoursEstimated = false;
    }

    // Recalculate priority if anything in the formula changed
    if (updates.deadline || updates.difficulty || updates.durationHours !== undefined) {
      const merged = { ...existing.toObject(), ...updates };
      updates.priorityScore = calculatePriorityScore(merged, req.user.availableHoursPerDay || 4);
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { returnDocument: 'after' }
    );
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;