import { useState } from 'react';
import { api } from '../utils/api';

export default function LoginScreen({ onLogin }) {
  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.auth(phone.trim());
      onLogin(user);
    } catch {
      setError('Phone number not recognized. Check your number and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white text-2xl mb-4">
            📋
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Tracker</h1>
          <p className="text-gray-500 mt-1 text-sm">Enter your phone number to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
              autoComplete="tel"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            {loading ? 'Checking…' : 'Continue'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">Private internal tool</p>
      </div>
    </div>
  );
}
