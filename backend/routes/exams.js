const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');

function estimatePrepHours(difficulty, daysUntilExam) {
  const baseHoursByDifficulty = { Easy: 5, Medium: 10, Hard: 18 };
  const base = baseHoursByDifficulty[difficulty] || 10;
  // Cap prep hours if the exam is very soon (can't cram more than realistic)
  return daysUntilExam < 3 ? Math.min(base, daysUntilExam * 3) : base;
}

// Create an exam
router.post('/', async (req, res) => {
  try {
    const { userId, subject, date, difficulty, prepHoursNeeded } = req.body;

    let finalPrepHours = prepHoursNeeded;
    if (!finalPrepHours) {
      const daysUntilExam = Math.max(1, Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24)));
      finalPrepHours = estimatePrepHours(difficulty, daysUntilExam);
    }

    const exam = await Exam.create({ userId, subject, date, difficulty, prepHoursNeeded: finalPrepHours });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all exams for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.params.userId }).sort({ date: 1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update an exam
router.put('/:id', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an exam
router.delete('/:id', async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;