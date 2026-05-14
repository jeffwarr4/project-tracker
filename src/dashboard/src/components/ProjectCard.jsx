import { useState } from 'react';
import MessageModal from './MessageModal';

const TYPE_COLORS = {
  'project created':      'bg-green-100 text-green-700',
  'scope change':         'bg-amber-100 text-amber-700',
  'status change':        'bg-purple-100 text-purple-700',
  'new document added':   'bg-indigo-100 text-indigo-700',
  'hours adjusted':       'bg-orange-100 text-orange-700',
  'collaboration message':'bg-pink-100 text-pink-700',
  'time logged':          'bg-blue-100 text-blue-700',
  'note':                 'bg-gray-100 text-gray-600',
};

export default function ProjectCard({ project, recentActivity, user, onClick }) {
  const [showMsg, setShowMsg] = useState(false);

  const { name, client, hoursLogged, estimatedHours, status } = project;
  const pct = estimatedHours ? Math.min(100, Math.round((hoursLogged / estimatedHours) * 100)) : null;
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

  const statusBadge = {
    'active':    'bg-green-100 text-green-700',
    'on-hold':   'bg-amber-100 text-amber-700',
    'completed': 'bg-gray-100 text-gray-500',
    'cancelled': 'bg-red-100 text-red-600',
    'archived':  'bg-gray-100 text-gray-400',
  }[status] || 'bg-gray-100 text-gray-500';

  return (
    <>
      <div
        onClick={onClick}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.98]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{name}</h3>
            {client && <p className="text-xs text-gray-500 mt-0.5 truncate">{client}</p>}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusBadge}`}>
            {status}
          </span>
        </div>

        {/* Progress bar */}
        {estimatedHours ? (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{hoursLogged}h logged</span>
              <span>{estimatedHours}h est.</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-xs text-gray-400 mt-0.5">{pct}%</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 mb-3">{hoursLogged}h logged · no estimate</p>
        )}

        {/* Recent activity tags */}
        {recentActivity.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {recentActivity.slice(0, 3).map((a, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.updateType] || TYPE_COLORS['note']}`}>
                {a.updateType}
              </span>
            ))}
          </div>
        )}

        {/* Message button */}
        <button
          onClick={e => { e.stopPropagation(); setShowMsg(true); }}
          className="w-full py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          💬 Message
        </button>
      </div>

      {showMsg && (
        <MessageModal project={project} user={user} onClose={() => setShowMsg(false)} />
      )}
    </>
  );
}
