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

// Loaded after initializeApp, because it uses Firebase
const { requireAuth, requireUser } = require('./middleware/auth');

const app = express();

// Online: only the listed sites may call the backend (spaces and trailing "/" are ignored).
// Locally (no CLIENT_URL): anything is allowed.
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/+$/, ''))
  : '*';
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Every API route needs a valid login. Only /users works before the profile exists (sign-up).
const loggedIn = [requireAuth, requireUser];

app.use('/api/users', requireAuth, require('./routes/users'));
app.use('/api/tasks', loggedIn, require('./routes/tasks'));
app.use('/api/exams', loggedIn, require('./routes/exams'));
app.use('/api/schedule', loggedIn, require('./routes/schedule'));
app.use('/api/chat', loggedIn, require('./routes/chat'));
app.use('/api/summarize', loggedIn, require('./routes/summarize'));
app.use('/api/reports', loggedIn, require('./routes/reports'));
app.use('/api/quiz-results', loggedIn, require('./routes/quizResults'));

app.get('/', (req, res) => {
  res.send('StudyNova backend is running');
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));