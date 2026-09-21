import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { Users, Building2, Briefcase, ClipboardList, CheckCircle2, Trophy, Clock3, Plus, ArrowRight, Activity } from 'lucide-react'
import { RegistrationsByCompany, SelectionStatusChart, MonthlyActivityChart } from '../components/ChartComponents'
import { PageHeader, StatCard, SectionCard, LoadingState, ErrorState, StatusBadge } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate } from '../utils/driveUtils'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [charts, setCharts] = useState(null)
  const [recentDrives, setRecentDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/charts'), api.get('/drives?includeAll=true')])
      .then(([statsRes, chartsRes, drivesRes]) => {
        setStats(statsRes.data)
        setCharts(chartsRes.data)
        const drives = Array.isArray(drivesRes.data) ? drivesRes.data : []
        setRecentDrives(drives.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5))
        setLoading(false)
      })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load dashboard')); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  if (loading) return <LoadingState lines={5} title="Loading admin dashboard…" />
  if (error) return <ErrorState message="Could not load dashboard" detail={error} onRetry={load} />
  if (!stats) return <ErrorState message="No data" onRetry={load} />

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title={`${greeting()}, Admin 👋`}
        subtitle="Here's what's happening with placements today."
        actions={<Link to="/admin/drives/new" className="btnx btnx-primary"><Plus size={16} /> New Drive</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-5">
        <StatCard label="Students" value={stats?.totalStudents ?? 0} hint="Registered" icon={<Users size={20} />} tone="blue" />
        <StatCard label="Companies" value={stats?.totalCompanies ?? 0} hint="Partners" icon={<Building2 size={20} />} tone="purple" />
        <StatCard label="Active Drives" value={stats?.activeDrives ?? 0} hint={`${stats?.totalDrives ?? 0} total`} icon={<Briefcase size={20} />} tone="green" />
        <StatCard label="Applications" value={stats?.totalRegistrations ?? 0} hint="All time" icon={<ClipboardList size={20} />} tone="slate" />
        <StatCard label="Shortlisted" value={stats?.shortlisted ?? 0} hint="In pipeline" icon={<Clock3 size={20} />} tone="yellow" />
        <StatCard label="Selected" value={stats?.selected ?? 0} hint="Offers" icon={<Trophy size={20} />} tone="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <SectionCard title="Registrations by company" subtitle="Real application volume" className="xl:col-span-2">
          {charts?.companyRegs ? <RegistrationsByCompany data={charts.companyRegs} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
        <SectionCard title="Selection funnel" subtitle="Live pipeline">
          {charts?.selectionStats ? <SelectionStatusChart data={charts.selectionStats} /> : <p className="text-sm text-slate-500">No data.</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            {[['Rejected', stats?.rejected ?? 0, 'text-red-700 bg-red-50 border-red-100'], ['Not registered', stats?.notRegistered ?? 0, 'text-slate-600 bg-slate-50 border-slate-200']].map(([k, v, cls]) => (
              <div key={k} className={`rounded-xl border px-3 py-2 ${cls}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{k}</p>
                <p className="text-lg font-extrabold">{v}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Monthly activity" subtitle="Applications over time" className="xl:col-span-2">
          {charts?.monthlyActivity ? <MonthlyActivityChart data={charts.monthlyActivity} /> : <p className="text-sm text-slate-500">No data.</p>}
        </SectionCard>
        <SectionCard
          title="Latest drives"
          subtitle="Most recently created"
          actions={<Link to="/admin/drives" className="text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1">View all <ArrowRight size={13} /></Link>}
        >
          <div className="space-y-2.5">
            {recentDrives.length === 0 && <p className="text-sm text-slate-500">No drives yet.</p>}
            {recentDrives.map(d => (
              <Link key={d.id} to={`/admin/drives/${d.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50/40 transition">
                <CompanyLogo name={d.company} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 truncate">{d.company} · {d.role}</span>
                  <span className="block text-xs text-slate-500">Deadline {formatDate(d.deadline)}</span>
                </span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-900 text-white px-4 py-3 text-xs flex items-center gap-2">
            <Activity size={14} /> Tip: publish drafts to notify all students instantly.
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
