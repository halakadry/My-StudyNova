const express = require('express');
const multer = require('multer');
const router = express.Router();
const { summarizeFile } = require('../services/summaryService');

// Files are kept in memory only (never saved to disk), max 15 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'The file is too big. The maximum is 15 MB.' });
      }
      return res.status(400).json({ error: 'Upload failed. Please try again.' });
    }

    if (!req.file) return res.status(400).json({ error: 'Please choose a file first.' });

    try {
      const result = await summarizeFile(req.file, req.body.language || 'auto');
      res.json(result);
    } catch (err) {
      if (err.message === 'UNSUPPORTED') {
        return res.status(400).json({ error: 'Only PDF, Word (.docx) and .txt files are supported.' });
      }
      if (err.message === 'EMPTY') {
        return res.status(400).json({ error: 'No text was found in this file.' });
      }
      console.error('Summarize error:', err.message);
      res.status(500).json({ error: 'Could not summarize this file. Please try again.' });
    }
  });
});

module.exports = router;