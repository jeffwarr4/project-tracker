const cards = [
  { key: 'activeProjects', label: 'Active',        icon: '🚀', color: 'text-indigo-600 bg-indigo-50' },
  { key: 'hoursThisWeek',  label: 'This week',     icon: '⏱️', color: 'text-blue-600 bg-blue-50',   suffix: 'h' },
  { key: 'hoursRemaining', label: 'Remaining',     icon: '📊', color: 'text-amber-600 bg-amber-50', suffix: 'h' },
  { key: 'completedCount', label: 'Completed',     icon: '✅', color: 'text-green-600 bg-green-50' },
];

export default function StatCards({ stats }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
      {cards.map(({ key, label, icon, color, suffix }) => (
        <div key={key} className="flex items-center gap-3 px-4 py-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${color}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-gray-900 leading-tight">
              {stats ? `${stats[key] ?? '—'}${suffix || ''}` : '—'}
            </div>
            <div className="text-xs text-gray-500 truncate">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
