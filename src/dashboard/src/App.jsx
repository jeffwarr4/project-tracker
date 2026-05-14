import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

const STORAGE_KEY = 'pt_user';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  function handleLogin(userInfo) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo));
    setUser(userInfo);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
