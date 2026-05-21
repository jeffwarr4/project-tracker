import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import TimeLogModal from './TimeLogModal';

const DOT = {
  'project created':      'bg-green-500',
  'scope change':         'bg-amber-500',
  'status change':        'bg-purple-500',
  'new document added':   'bg-indigo-500',
  'hours adjusted':       'bg-orange-500',
  'collaboration message':'bg-pink-500',
  'time logged':          'bg-blue-500',
  'note':                 'bg-gray-400',
};

export default function ProjectDetail({ project, user, onClose }) {
  const [timelog,  setTimelog]  = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showLog,  setShowLog]  = useState(false);

  const loadTimelog = useCallback(() =>
    api.timelog({ projectId: project.id }).then(t => setTimelog(t.entries || [])),
  [project.id]);

  useEffect(() => {
    Promise.all([
      api.timelog({ projectId: project.id }),
      api.activity({ projectId: project.id }),
    ]).then(([t, a]) => {
      setTimelog(t.entries || []);
      setActivity(a.entries || []);
    }).finally(() => setLoading(false));
  }, [project.id]);

  const { name, client, status, description, documentsNeeded, estimatedHours, hoursLogged, createdBy } = project;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl md:rounded-2xl shadow-xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            {client && <p className="text-sm text-gray-500 mt-0.5">{client}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-1">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 pb-0">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Status',    value: status },
              { label: 'Created by',value: createdBy || '—' },
              { label: 'Est. hours',value: estimatedHours ? `${estimatedHours}h` : '—' },
              { label: 'Logged',    value: `${hoursLogged}h` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          )}

          {documentsNeeded?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Documents needed</h4>
              <div className="flex flex-wrap gap-2">
                {documentsNeeded.map(d => (
                  <span key={d} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
          ) : (
            <>
              {/* Time log */}
              {timelog.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Time log</h4>
                  <div className="space-y-2">
                    {timelog.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-blue-50 rounded-xl px-3 py-2">
                        <span className="font-semibold text-blue-700 shrink-0">{e.hours}h</span>
                        <span className="text-gray-600 flex-1 truncate">{e.description || 'No description'}</span>
                        <span className="text-gray-400 text-xs shrink-0">{e.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              {activity.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Activity history</h4>
                  <div className="space-y-2">
                    {activity.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${DOT[e.updateType] || 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 leading-tight">{e.description || e.updateType}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{e.updatedBy} · {e.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={() => setShowLog(true)}
            className="w-full py-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            ⏱ Log Time
          </button>
        </div>
      </div>

      {showLog && (
        <TimeLogModal
          project={project}
          user={user}
          onClose={() => setShowLog(false)}
          onLogged={loadTimelog}
        />
      )}
    </div>
  );
}
