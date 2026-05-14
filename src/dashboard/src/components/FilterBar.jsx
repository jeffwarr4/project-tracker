const STATUS_PILLS = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'on-hold',   label: 'On Hold' },
  { value: 'completed', label: 'Done' },
];

const DATE_PILLS = [
  { value: 'all',   label: 'All time' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
];

export default function FilterBar({ filters, onChange, assignees }) {
  const pill = (active) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
    }`;

  return (
    <div className="space-y-3">
      {/* Status pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_PILLS.map(s => (
          <button key={s.value} className={pill(filters.status === s.value)}
            onClick={() => onChange({ ...filters, status: s.value })}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {/* Assignee dropdown */}
        <select
          value={filters.assignee}
          onChange={e => onChange({ ...filters, assignee: e.target.value })}
          className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Date range pills */}
        {DATE_PILLS.map(d => (
          <button key={d.value} className={pill(filters.dateRange === d.value)}
            onClick={() => onChange({ ...filters, dateRange: d.value })}>
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
