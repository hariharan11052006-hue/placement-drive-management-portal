import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { ScrollText, Search, UserPlus, Briefcase, CheckCircle2, Megaphone, CalendarDays } from 'lucide-react'
import { PageHeader, Field, Input, LoadingState, ErrorState, EmptyState, NoResults } from '../components/ui'

function iconFor(action = '') {
  const a = action.toLowerCase()
  if (a.includes('register') || a.includes('student')) return <UserPlus size={15} />
  if (a.includes('drive') || a.includes('publish')) return <Briefcase size={15} />
  if (a.includes('shortlist') || a.includes('select')) return <CheckCircle2 size={15} />
  if (a.includes('notif')) return <Megaphone size={15} />
  if (a.includes('sched')) return <CalendarDays size={15} />
  return <ScrollText size={15} />
}

export default function AdminActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/activity-log')
      .then(res => { setLogs(Array.isArray(res.data) ? res.data : []); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load activity')); setLoading(false) })
  }
  useEffect(load, [])

  const filtered = useMemo(() => logs.filter(l => {
    const q = search.toLowerCase()
    if (!q) return true
    return String(l.action || '').toLowerCase().includes(q) || String(l.user || '').toLowerCase().includes(q) || String(l.details || '').toLowerCase().includes(q)
  }), [logs, search])

  const grouped = useMemo(() => {
    const map = new Map()
    filtered.forEach(l => {
      const key = l.date || 'Unknown date'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(l)
    })
    return [...map.entries()]
  }, [filtered])

  if (loading) return <LoadingState lines={6} title="Loading activity…" />
  if (error && logs.length === 0) return <ErrorState message="Could not load activity" detail={error} onRetry={load} />

  return (
    <div>
      <PageHeader eyebrow="Audit trail" title="Activity Log" subtitle={`${logs.length} events · newest first`} />
      <div className="surface p-4 mb-5">
        <Field label="Search activity">
          <div className="input-icon-wrap"><Search size={15} className="icon-left" /><Input placeholder="Action, user, details…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </Field>
      </div>
      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={26} />} title="No activity yet" subtitle="Logins, applications and status changes will appear here." />
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => setSearch('')} />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{day}</p>
              <div className="relative pl-8 space-y-3">
                <span className="timeline-rail" aria-hidden />
                {items.map(log => (
                  <div key={log.id} className="surface p-4 relative">
                    <span className="absolute -left-8 top-4 w-4 h-4 rounded-full bg-white border-[3px] border-brand-500" aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center shrink-0">{iconFor(log.action)}</span>
                      <span className="badgex badge-blue">{log.action}</span>
                      <span className="text-xs text-slate-400 ml-auto tabular-nums">{log.time}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-2">{log.details}</p>
                    <p className="text-xs text-slate-400 mt-1">by {log.user}{log.role ? ` · ${log.role}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
