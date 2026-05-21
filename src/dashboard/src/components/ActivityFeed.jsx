import { useState } from 'react';

const DATE_PILLS = [
  { value: 'all',   label: 'All time' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
];

const DOT = {
  'project created':       'bg-green-500',
  'time logged':           'bg-blue-500',
  'scope change':          'bg-amber-500',
  'status change':         'bg-purple-500',
  'new document added':    'bg-indigo-500',
  'hours adjusted':        'bg-orange-500',
  'collaboration message': 'bg-pink-500',
  'note':                  'bg-gray-400',
};

function relative(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ActivityFeed({ entries }) {
  const [dateRange, setDateRange] = useState('all');
  const now = new Date();

  const filtered = entries.filter(e => {
    if (dateRange === 'week') {
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);
      if (e.date < monday.toISOString().split('T')[0]) return false;
    } else if (dateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      if (e.date < monthStart) return false;
    }
    return true;
  });

  const pill = (active) =>
    `px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'text-gray-500 hover:text-indigo-600'
    }`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-800 text-sm">Activity Feed</h3>
        <div className="flex gap-0.5">
          {DATE_PILLS.map(d => (
            <button key={d.value} className={pill(dateRange === d.value)}
              onClick={() => setDateRange(d.value)}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No activity to show</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map((e, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${DOT[e.updateType] || 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">
                  <span className="font-medium">{e.projectId}</span>
                  {e.description && <> — <span className="text-gray-600">{e.description}</span></>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.updatedBy && <span>{e.updatedBy} · </span>}
                  {relative(e.date)}
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 pt-0.5 hidden sm:block">
                {e.updateType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
