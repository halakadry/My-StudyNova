import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [showRegister, setShowRegister] = useState(false);

  return showRegister ? (
    <Register onSwitchToLogin={() => setShowRegister(false)} />
  ) : (
    <Login onSwitchToRegister={() => setShowRegister(true)} />
  );
}

export default App;