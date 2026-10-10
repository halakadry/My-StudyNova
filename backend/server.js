require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initializeApp, cert } = require('firebase-admin/app');

// Online (Render): key comes from the FIREBASE_SERVICE_ACCOUNT setting.
// Locally: key comes from serviceAccountKey.json (never pushed to GitHub).
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const app = express();

// Online: only the Vercel site may call the backend. Locally: anything is allowed.
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : '*'
}));
app.use(express.json());

app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/summarize', require('./routes/summarize'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/quiz-results', require('./routes/quizResults'));

app.get('/', (req, res) => {
  res.send('StudyNova backend is running');
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));