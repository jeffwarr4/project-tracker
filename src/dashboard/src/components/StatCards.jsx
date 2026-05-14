const cards = [
  { key: 'activeProjects', label: 'Active Projects', icon: '🚀', color: 'text-indigo-600 bg-indigo-50' },
  { key: 'hoursThisWeek',  label: 'Hours This Week', icon: '⏱️',  color: 'text-blue-600 bg-blue-50',   suffix: 'h' },
  { key: 'hoursRemaining', label: 'Hours Remaining', icon: '📊',  color: 'text-amber-600 bg-amber-50', suffix: 'h' },
  { key: 'completedCount', label: 'Completed',        icon: '✅',  color: 'text-green-600 bg-green-50' },
];

export default function StatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon, color, suffix }) => (
        <div key={key} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-lg ${color} mb-2`}>
            {icon}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats ? `${stats[key] ?? '—'}${suffix || ''}` : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}
