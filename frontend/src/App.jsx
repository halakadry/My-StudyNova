import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import api from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const res = await api.post('/users', {
            firebaseUid: user.uid,
            name: user.displayName || '',
            email: user.email,
          });
          setDbUser(res.data);
        } catch (err) {
          console.error('Could not sync user with backend', err);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading...</p>;

  if (firebaseUser && dbUser) {
    return <Dashboard dbUser={dbUser} />;
  }

  return showRegister ? (
    <Register onSwitchToLogin={() => setShowRegister(false)} />
  ) : (
    <Login onSwitchToRegister={() => setShowRegister(true)} />
  );
}

export default App;