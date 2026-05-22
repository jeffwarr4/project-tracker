const STATUS_PILLS = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'on-hold',   label: 'On Hold' },
  { value: 'completed', label: 'Done' },
];

export default function FilterBar({ filters, onChange, assignees, counts = {} }) {
  const pill = (active) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
    }`;

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {STATUS_PILLS.map(s => (
        <button key={s.value} className={pill(filters.status === s.value)}
          onClick={() => onChange({ ...filters, status: s.value })}>
          {s.label}
          {counts[s.value] > 0 && (
            <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              filters.status === s.value
                ? 'bg-white/25 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[s.value]}
            </span>
          )}
        </button>
      ))}
      <div className="w-px h-5 bg-gray-200 mx-0.5 hidden sm:block" />
      <select
        value={filters.assignee}
        onChange={e => onChange({ ...filters, assignee: e.target.value })}
        className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="all">All assignees</option>
        {assignees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}
