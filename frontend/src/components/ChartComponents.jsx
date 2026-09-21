import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

const COLORS = ['#2549eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#0284c7', '#ea580c']

const chartTooltip = {
  contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px rgba(16,24,40,.12)' },
}

export function RegistrationsByCompany({ data }) {
  const safe = data && typeof data === 'object' ? data : {}
  const chartData = Object.entries(safe).map(([name, value]) => ({ name: String(name).slice(0, 14), value: Number(value) || 0 }))
  if (chartData.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-12} height={48} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip {...chartTooltip} />
        <Bar dataKey="value" fill="#2549eb" radius={[8, 8, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SelectionStatusChart({ data }) {
  const safe = data && typeof data === 'object' ? data : {}
  const entries = Object.entries(safe).map(([name, value]) => ({ name, value: Number(value) || 0 }))
  if (entries.length === 0 || entries.every(d => !d.value)) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={entries} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={92} paddingAngle={3} stroke="#fff" strokeWidth={2}>
          {entries.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...chartTooltip} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function MonthlyActivityChart({ data }) {
  const safe = Array.isArray(data) ? data : []
  if (safe.length === 0) return <p className="text-sm text-slate-500">No activity yet.</p>
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={safe} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip {...chartTooltip} />
        <Line type="monotone" dataKey="count" stroke="#2549eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2549eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function DepartmentWiseChart({ data }) {
  const safe = data && typeof data === 'object' ? data : {}
  const chartData = Object.entries(safe).map(([name, value]) => ({ name: String(name).slice(0, 12), value: Number(value) || 0 }))
  if (chartData.length === 0) return <p className="text-sm text-slate-500">No data yet.</p>
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={86} />
        <Tooltip {...chartTooltip} />
        <Bar dataKey="value" fill="#16a34a" radius={[0, 8, 8, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
