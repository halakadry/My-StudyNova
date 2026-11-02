const express = require('express');
const router = express.Router();
const QuizResult = require('../models/QuizResult');

// req.user = the logged-in user (set in server.js)

// Save a finished practice session
router.post('/', async (req, res) => {
  try {
    const { title, total, known } = req.body;
    const totalNum = Math.round(Number(total));
    const knownNum = Math.round(Number(known));

    if (!totalNum || totalNum < 1 || knownNum < 0 || knownNum > totalNum) {
      return res.status(400).json({ error: 'Invalid quiz result' });
    }

    const result = await QuizResult.create({
      userId: req.user._id,
      title: String(title || 'Practice').slice(0, 200),
      total: totalNum,
      known: knownNum,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The logged-in user's practice history, newest first
router.get('/user/:userId', async (req, res) => {
  try {
    const results = await QuizResult.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;