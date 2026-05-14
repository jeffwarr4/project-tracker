import { useState } from 'react';
import ProjectCard from './ProjectCard';
import ProjectDetail from './ProjectDetail';

function getColumn(project) {
  if (['completed', 'cancelled', 'archived'].includes(project.status)) return 'Complete';
  if (project.hoursLogged > 0) return 'In Progress';
  return 'Not Started';
}

const COLUMN_ICONS = { 'Not Started': '⏳', 'In Progress': '🔄', 'Complete': '✅' };
const COLUMN_ORDER = ['Not Started', 'In Progress', 'Complete'];

export default function KanbanBoard({ projects, activity, user, filters }) {
  const [expanded, setExpanded] = useState('In Progress');
  const [detail,   setDetail]   = useState(null);

  // Apply filters
  const filtered = projects.filter(p => {
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.assignee !== 'all' && p.createdBy !== filters.assignee) return false;
    return true;
  });

  const columns = Object.fromEntries(
    COLUMN_ORDER.map(col => [col, filtered.filter(p => getColumn(p) === col)])
  );

  function recentActivityFor(projectId) {
    return activity.filter(a => a.projectId === projectId).slice(0, 3);
  }

  return (
    <>
      {/* Desktop: side-by-side columns */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {COLUMN_ORDER.map(col => (
          <div key={col} className="bg-gray-50 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span>{COLUMN_ICONS[col]}</span>
              <h3 className="font-semibold text-gray-700 text-sm">{col}</h3>
              <span className="ml-auto bg-white text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
                {columns[col].length}
              </span>
            </div>
            <div className="space-y-3">
              {columns[col].length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No projects</p>
                : columns[col].map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      recentActivity={recentActivityFor(p.id)}
                      user={user}
                      onClick={() => setDetail(p)}
                    />
                  ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: accordion */}
      <div className="md:hidden space-y-2">
        {COLUMN_ORDER.map(col => {
          const isOpen = expanded === col;
          return (
            <div key={col} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-4 py-3.5"
                onClick={() => setExpanded(isOpen ? null : col)}
              >
                <span>{COLUMN_ICONS[col]}</span>
                <span className="font-semibold text-gray-800 text-sm flex-1 text-left">{col}</span>
                <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {columns[col].length}
                </span>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-3">
                  {columns[col].length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">No projects</p>
                    : columns[col].map(p => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          recentActivity={recentActivityFor(p.id)}
                          user={user}
                          onClick={() => setDetail(p)}
                        />
                      ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detail && <ProjectDetail project={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
