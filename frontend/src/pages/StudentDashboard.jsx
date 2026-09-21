import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { Briefcase, BadgeCheck, ClipboardList, Clock3, Trophy, XCircle, ArrowRight, MapPin, CalendarDays } from 'lucide-react'
import { PageHeader, StatCard, SectionCard, LoadingState, ErrorState, EmptyState, StatusBadge } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate, deadlineLabel } from '../utils/driveUtils'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function StudentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api.get('/students/me/dashboard')
      .then(res => { setData(res.data); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load dashboard')); setLoading(false) })
  }
  useEffect(load, [])

  if (loading) return <LoadingState lines={5} title="Loading your placements…" />
  if (error) return <ErrorState message="Could not load dashboard" detail={error} onRetry={load} />
  if (!data) return <ErrorState message="No dashboard data" onRetry={load} />

  const { student, counts, upcomingDrives, recentApplications } = data
  const recommended = (upcomingDrives || []).filter(d => d.eligible && !d.applied).slice(0, 3)

  return (
    <div>
      <PageHeader
        eyebrow="Student portal"
        title={`${greeting()}, ${student.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Find your next placement opportunity."
        actions={<Link to="/student/profile" className="btnx btnx-secondary btnx-sm">Profile · {student.profileCompletion}% complete</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Available" value={counts.available} hint="Open drives" icon={<Briefcase size={19} />} tone="blue" />
        <StatCard label="Eligible" value={counts.eligible} hint="You qualify" icon={<BadgeCheck size={19} />} tone="green" />
        <StatCard label="Applied" value={counts.registered} hint="Submitted" icon={<ClipboardList size={19} />} tone="purple" />
        <StatCard label="Shortlisted" value={counts.shortlisted} hint="In pipeline" icon={<Clock3 size={19} />} tone="yellow" />
      </div>

      {recommended.length > 0 && (
        <SectionCard title="Recommended for you" subtitle="Eligible drives you haven't applied to yet" className="mb-4 !border-emerald-200">
          <div className="grid md:grid-cols-3 gap-3">
            {recommended.map(drive => (
              <Link key={drive.id} to={`/student/drives/${drive.id}`} className="rounded-xl border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-pop transition bg-white">
                <div className="flex items-center gap-2.5 mb-2">
                  <CompanyLogo name={drive.company} size={38} />
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-sm truncate">{drive.company}</p>
                    <p className="text-xs text-slate-500 truncate">{drive.role}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-emerald-700">✓ Eligible · {deadlineLabel(drive.deadline)}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700">View & Apply <ArrowRight size={13} /></span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard
          title="Upcoming drives"
          subtitle="Deadlines approaching"
          actions={<Link to="/student/drives" className="text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1">View all <ArrowRight size={13} /></Link>}
        >
          {(!upcomingDrives || upcomingDrives.length === 0) && <p className="text-sm text-slate-500">No upcoming drives.</p>}
          <div className="space-y-2.5">
            {(upcomingDrives || []).slice(0, 5).map(drive => (
              <Link key={drive.id} to={`/student/drives/${drive.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 hover:border-brand-200 hover:bg-brand-50/40 transition">
                <CompanyLogo name={drive.company} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 truncate">{drive.company} — {drive.role}</span>
                  <span className="block text-xs text-slate-500">Deadline {formatDate(drive.deadline)} · {deadlineLabel(drive.deadline)}</span>
                  <span className={`mt-1 inline-block text-[11px] font-bold ${drive.applied ? 'text-brand-700' : drive.eligible ? 'text-green-700' : 'text-red-600'}`}>
                    {drive.applied ? '✓ Applied' : drive.eligible ? '✓ Eligible' : '✕ Not Eligible'}
                  </span>
                </span>
                <ArrowRight size={16} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent applications"
          subtitle="Your latest moves"
          actions={<Link to="/student/applications" className="text-xs font-bold text-brand-700 hover:underline inline-flex items-center gap-1">Track all <ArrowRight size={13} /></Link>}
        >
          {(!recentApplications || recentApplications.length === 0) ? (
            <EmptyState title="No applications yet" subtitle="Browse drives and apply in one click." action={<Link to="/student/drives" className="btnx btnx-primary btnx-sm">Browse drives</Link>} />
          ) : (
            <div className="space-y-2.5">
              {(recentApplications || []).slice(0, 5).map(app => (
                <Link key={app.id} to={`/student/drives/${app.driveId}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 hover:border-brand-200 hover:bg-brand-50/40 transition">
                  <CompanyLogo name={app.drive?.company} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 truncate">{app.drive?.company} — {app.drive?.role}</span>
                    <span className="block text-xs text-slate-500">Applied {formatDate(app.registeredAt)}</span>
                  </span>
                  <StatusBadge status={app.status} />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[['Selected', counts.selected, 'text-green-700 bg-green-50 border-green-100'], ['Shortlisted', counts.shortlisted, 'text-amber-700 bg-amber-50 border-amber-100'], ['Rejected', counts.rejected, 'text-red-700 bg-red-50 border-red-100']].map(([k, v, cls]) => (
              <div key={k} className={`rounded-xl border px-3 py-2 ${cls}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{k}</p>
                <p className="text-lg font-extrabold">{v}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
