const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// Save a support message from the website
router.post('/', async (req, res) => {
  try {
    const { userId, email, category, message, page, language, userAgent } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const report = await Report.create({
      userId: userId || undefined,
      email: email ? String(email).slice(0, 200) : undefined,
      category: ['bug', 'question', 'idea'].includes(category) ? category : 'bug',
      message: String(message).trim().slice(0, 5000),
      page: page ? String(page).slice(0, 50) : undefined,
      language: language ? String(language).slice(0, 5) : undefined,
      userAgent: userAgent ? String(userAgent).slice(0, 300) : undefined,
    });

    console.log(`New support report (${report.category}) from ${report.email || 'unknown user'}`);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;