import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { CalendarDays, MapPin, Clock3, Video } from 'lucide-react'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '../components/ui'
import { formatDate } from '../utils/driveUtils'

const ROUND_TONE = {
  'Aptitude Test': 'bg-brand-50 text-brand-700 border-brand-100',
  'Technical Test': 'bg-violet-50 text-violet-700 border-violet-100',
  'Coding Round': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Technical Interview': 'bg-sky-50 text-sky-700 border-sky-100',
  'HR Round': 'bg-amber-50 text-amber-700 border-amber-100',
}

export default function StudentSchedules() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/schedules/my')
      .then(res => { setSchedules(Array.isArray(res.data) ? res.data : []); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err, 'Could not load schedules')); setLoading(false) })
  }
  useEffect(load, [])

  const grouped = useMemo(() => {
    const sorted = [...schedules].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
    const map = new Map()
    sorted.forEach(s => {
      const key = s.date ? formatDate(s.date) : 'To be scheduled'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    })
    return [...map.entries()]
  }, [schedules])

  if (loading) return <LoadingState lines={4} title="Loading schedules…" />
  if (error) return <ErrorState message="Could not load schedules" detail={error} onRetry={load} />

  return (
    <div>
      <PageHeader eyebrow="Calendar" title="My Schedules" subtitle="Only rounds for drives you applied to · times are as posted by the cell" />
      {schedules.length === 0 ? (
        <EmptyState icon={<CalendarDays size={26} />} title="No schedules yet" subtitle="Interview and test rounds for your applications will appear here." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{day}</p>
              <div className="relative pl-8 space-y-3">
                <span className="timeline-rail" aria-hidden />
                {items.map(s => (
                  <div key={s.id} className="surface surface-hover p-4 md:p-5 relative">
                    <span className="absolute -left-8 top-5 w-4 h-4 rounded-full bg-white border-[3px] border-emerald-500" aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-1 ${ROUND_TONE[s.round || s.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s.round || s.type}</span>
                      <h3 className="font-extrabold text-slate-900">{s.company || 'Schedule'}</h3>
                      {(s.time) && <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-slate-800 tabular-nums"><Clock3 size={14} className="text-slate-400" /> {s.time}</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
                      {(s.location || s.venue) && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {s.location || s.venue}</span>}
                      {s.meetingLink && <a href={s.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"><Video size={14} /> Join meeting</a>}
                    </div>
                    {s.instructions && <p className="mt-2.5 text-[13px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">{s.instructions}</p>}
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
