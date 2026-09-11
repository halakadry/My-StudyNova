import { useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (isLocked) {
      const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
      setError(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAttempts(0);
      // TODO: redirect to dashboard
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_DURATION_MS);
        setError('Too many failed attempts. Account locked for 15 minutes.');
      } else {
        setError(`Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempt(s) left.`);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      // TODO: redirect to dashboard
    } catch (err) {
      setError('Google sign-in failed.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password".');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Password reset email sent.');
    } catch (err) {
      setError('Could not send reset email. Check the address and try again.');
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1>StudyNova</h1>
      <h2>Log in</h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={isLocked} style={{ width: '100%', padding: 10 }}>
          Log in
        </button>
      </form>

      <button onClick={handleGoogleLogin} style={{ width: '100%', padding: 10, marginTop: 8 }}>
        Continue with Google
      </button>

      <p style={{ marginTop: 12 }}>
        <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
          Forgot password?
        </button>
      </p>

      <p style={{ marginTop: 8 }}>
        Don't have an account?{' '}
        <button onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
          Register
        </button>
      </p>
    </div>
  );
}

export default Login;