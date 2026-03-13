import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = { 'Low': '#ef4444', 'Medium': '#f97316', 'High': '#3b82f6', 'Excellent': '#22c55e' }

export default function ScoreBarChart({ distribution }) {
  const data = [
    { name: 'Low', label: '0–49%', count: distribution?.low?.count || 0 },
    { name: 'Medium', label: '50–74%', count: distribution?.medium?.count || 0 },
    { name: 'High', label: '75–89%', count: distribution?.high?.count || 0 },
    { name: 'Excellent', label: '90–100%', count: distribution?.excellent?.count || 0 },
  ]
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v) => [v, 'Students']} labelFormatter={(l) => data.find(d=>d.name===l)?.label || l} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => <Cell key={entry.name} fill={COLORS[entry.name]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
