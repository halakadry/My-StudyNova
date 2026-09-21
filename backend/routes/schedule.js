const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const { generateSchedule } = require('../services/geminiService');
const detectOverload = require('../utils/overloadDetection');

async function buildAndSaveSchedule(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const tasks = await Task.find({ userId, status: 'pending' }).sort({ priorityScore: -1 });
  if (tasks.length === 0) throw new Error('No pending tasks to schedule');

  const availableHoursPerDay = user.availableHoursPerDay || 4;
  const constraints = user.constraints || {};

  let result = await generateSchedule(tasks, [], availableHoursPerDay, constraints);
  let overloadCheck = detectOverload(result.schedule, availableHoursPerDay);

  let retryCount = 0;
  while (overloadCheck.needsRegeneration && retryCount < 3) {
    retryCount++;
    result = await generateSchedule(tasks, [], availableHoursPerDay, constraints);
    overloadCheck = detectOverload(result.schedule, availableHoursPerDay);
  }

  // Save (replace any existing schedule for this user)
  await Schedule.findOneAndDelete({ userId });
  const savedSchedule = await Schedule.create({
    userId,
    entries: result.schedule,
    overloadedDays: overloadCheck.overloadedDays,
    isOverloaded: overloadCheck.isOverloaded,
    reliableSchedule: !overloadCheck.needsRegeneration
  });

  return { savedSchedule, regenerationAttempts: retryCount };
}

// Generate a new schedule
router.post('/generate', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildAndSaveSchedule(req.body.userId);
    res.status(200).json({ ...savedSchedule.toObject(), regenerationAttempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-schedule (same logic, used after a task changes)
router.post('/reschedule', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildAndSaveSchedule(req.body.userId);
    res.status(200).json({ ...savedSchedule.toObject(), regenerationAttempts, rescheduled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get the current saved schedule for a user
router.get('/:userId', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.params.userId });
    if (!schedule) return res.status(404).json({ error: 'No schedule found' });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;