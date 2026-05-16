import { useState } from 'react';
import { api } from '../utils/api';

export default function MessageModal({ project, user, onClose }) {
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.message({
        projectId:   project.id,
        projectName: project.name,
        message:     text.trim(),
        fromPhone:   user.phone,
      });
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-xl p-6 space-y-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Message about project</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="text-sm text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2 font-medium">
          {project.name}
          {project.client && <span className="text-indigo-400 font-normal"> · {project.client}</span>}
        </div>

        {sent ? (
          <div className="text-center py-4 text-green-600 font-medium">✓ Message sent via email</div>
        ) : (
          <>
            <textarea
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type your message…"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base resize-none"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send via Email'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
