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
  const [timelog,    setTimelog]    = useState([]);
  const [activity,   setActivity]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showLog,    setShowLog]    = useState(false);
  const [links,      setLinks]      = useState(project.links || []);
  const [addingLink, setAddingLink] = useState(false);
  const [newLabel,   setNewLabel]   = useState('');
  const [newUrl,     setNewUrl]     = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError,  setLinkError]  = useState('');

  const loadTimelog = useCallback(() =>
    api.timelog({ projectId: project.id }).then(t => setTimelog(t.entries || [])),
  [project.id]);

  async function handleAddLink() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setLinkSaving(true);
    setLinkError('');
    try {
      const updated = [...links, { label: newLabel.trim(), url: newUrl.trim() }];
      await api.updateLinks(project.id, updated);
      setLinks(updated);
      setNewLabel('');
      setNewUrl('');
      setAddingLink(false);
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setLinkSaving(false);
    }
  }

  async function handleRemoveLink(index) {
    const updated = links.filter((_, i) => i !== index);
    await api.updateLinks(project.id, updated).catch(() => {});
    setLinks(updated);
  }

  useEffect(() => {
    Promise.all([
      api.project(project.id),
      api.timelog({ projectId: project.id }),
      api.activity({ projectId: project.id }),
    ]).then(([p, t, a]) => {
      setLinks(p.project.links || []);
      setTimelog(t.entries || []);
      setActivity(a.entries || []);
    }).finally(() => setLoading(false));
  }, [project.id]);

  const { name, client, status, description, estimatedHours, hoursLogged, createdBy } = project;

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

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Links</h4>
            {links.length > 0 && (
              <div className="space-y-2 mb-3">
                {links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 text-sm text-indigo-600 font-medium hover:underline truncate"
                    >
                      {link.label}
                    </a>
                    <span className="text-xs text-gray-400 truncate max-w-[160px] hidden sm:block">
                      {link.url.replace(/^https?:\/\//, '')}
                    </span>
                    <button
                      onClick={() => handleRemoveLink(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {addingLink ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Label (e.g. Website)"
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <input
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://…"
                    onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {linkError && <p className="text-xs text-red-600">{linkError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddingLink(false); setNewLabel(''); setNewUrl(''); setLinkError(''); }}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLink}
                    disabled={linkSaving || !newLabel.trim() || !newUrl.trim()}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {linkSaving ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingLink(true)}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                + Add link
              </button>
            )}
          </div>

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
