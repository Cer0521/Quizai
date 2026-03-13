import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CompletionPieChart({ completed, inProgress, notStarted }) {
  const data = [
    { name: 'Completed', value: completed, color: '#22c55e' },
    { name: 'In Progress', value: inProgress, color: '#f97316' },
    { name: 'Not Started', value: notStarted, color: '#9ca3af' },
  ].filter(d => d.value > 0)

  if (!data.length) data.push({ name: 'No Data', value: 1, color: '#e5e7eb' })

  const total = completed + inProgress + notStarted
  const pct = total ? Math.round((completed / total) * 100) : 0

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={65} outerRadius={90} dataKey="value" paddingAngle={3}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [v, n]} />
          <Legend iconType="circle" iconSize={10} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{pct}%</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>
    </div>
  )
}
