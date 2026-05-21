import { useState } from 'react';
import { api } from '../utils/api';

export default function TimeLogModal({ project, user, onClose, onLogged }) {
  const today = new Date().toISOString().split('T')[0];
  const [hours,       setHours]      = useState('');
  const [description, setDesc]       = useState('');
  const [date,        setDate]       = useState(today);
  const [submitting,  setSubmitting] = useState(false);
  const [sent,        setSent]       = useState(false);
  const [error,       setError]      = useState('');

  async function handleSubmit() {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    setSubmitting(true);
    setError('');
    try {
      await api.logTime({
        projectId:   project.id,
        projectName: project.name,
        hours:       h,
        description: description.trim(),
        date,
        fromPhone:   user.phone,
      });
      setSent(true);
      setTimeout(() => { onClose(); onLogged?.(); }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-xl p-6 space-y-4 z-10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Log time</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="text-sm text-blue-700 bg-blue-50 rounded-xl px-3 py-2 font-medium">
          {project.name}
          {project.client && <span className="text-blue-400 font-normal"> · {project.client}</span>}
        </div>

        {sent ? (
          <div className="text-center py-4 text-green-600 font-medium">✓ Time logged</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hours</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDesc(e.target.value)}
                placeholder="What did you work on?"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !parseFloat(hours) || parseFloat(hours) <= 0}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Log Time'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
