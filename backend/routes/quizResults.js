const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');

// Save a finished practice session
router.post('/', async (req, res) => {
  try {
    const { userId, title, total, known } = req.body;
    const totalNum = Math.round(Number(total));
    const knownNum = Math.round(Number(known));

    if (!userId || !totalNum || totalNum < 1 || knownNum < 0 || knownNum > totalNum) {
      return res.status(400).json({ error: 'Invalid quiz result' });
    }

    const result = await QuizResult.create({
      userId,
      title: String(title || 'Practice').slice(0, 200),
      total: totalNum,
      known: knownNum,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A user's practice history, newest first
router.get('/user/:userId', async (req, res) => {
  try {
    const results = await QuizResult.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;