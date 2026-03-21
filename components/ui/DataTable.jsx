export default function DataTable({ columns, data, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-white/[0.04] ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-high">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant font-medium"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`border-t border-white/[0.04] hover:bg-white/[0.04] transition-colors ${i % 2 === 1 ? 'bg-white/[0.02]' : 'bg-transparent'}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-on-surface-variant"
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
