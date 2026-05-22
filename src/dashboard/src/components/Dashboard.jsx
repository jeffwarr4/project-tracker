import { useState } from 'react';
import { useData } from '../hooks/useData';
import StatCards from './StatCards';
import FilterBar from './FilterBar';
import KanbanBoard from './KanbanBoard';
import ActivityFeed from './ActivityFeed';

const DEFAULT_FILTERS = { status: 'active', assignee: 'all' };

export default function Dashboard({ user, onLogout }) {
  const { projects, stats, activity, loading, error, refreshing, refresh } = useData();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const assignees = [...new Set(projects.map(p => p.createdBy).filter(Boolean))].sort();
  const counts = {
    all:       projects.length,
    active:    projects.filter(p => p.status === 'active').length,
    'on-hold': projects.filter(p => p.status === 'on-hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="font-bold text-gray-900">Project Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50"
              title="Refresh"
            >
              ↻
            </button>
            <div className="text-sm text-gray-600 font-medium">{user.name}</div>
            <button onClick={onLogout} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="ptr-indicator">↻ Refreshing…</div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            Failed to load data: {error}
          </div>
        )}

        {loading && !projects.length ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="text-center">
              <div className="text-3xl mb-2 animate-pulse">📋</div>
              <p className="text-sm">Loading your projects…</p>
            </div>
          </div>
        ) : (
          <>
            <StatCards stats={stats} />

            <FilterBar filters={filters} onChange={setFilters} assignees={assignees} counts={counts} />

            <KanbanBoard
              projects={projects}
              activity={activity}
              user={user}
              filters={filters}
              refresh={refresh}
            />

            <ActivityFeed entries={activity} />
          </>
        )}
      </main>
    </div>
  );
}
