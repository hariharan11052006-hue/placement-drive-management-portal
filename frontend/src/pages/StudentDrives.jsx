import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { Search, MapPin, CalendarDays, BadgeCheck, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { PageHeader, Button, Field, Input, Select, StatusBadge, LoadingState, ErrorState, NoResults, EmptyState, SkillChips } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate, deadlineLabel } from '../utils/driveUtils'

export default function StudentDrives() {
  const [drives, setDrives] = useState([])
  const [eligibilityMap, setEligibilityMap] = useState({})
  const [registeredIds, setRegisteredIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eligibleOnly, setEligibleOnly] = useState(false)
  const [statusFilter, setStatusFilter] = useState('') // '', applied, not-applied
  const [sortBy, setSortBy] = useState('deadline')
  const [registeringId, setRegisteringId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loadError, setLoadError] = useState('')

  const loadApplications = () =>
    api.get('/applications').then(res => setRegisteredIds(new Set((res.data || []).map(r => r.driveId)))).catch(() => setRegisteredIds(new Set()))

  const load = () => {
    setLoading(true)
    setErrorMsg('')
    setLoadError('')
    Promise.all([
      api.get('/drives').then(res => setDrives((res.data || []).filter(d => String(d.status).toLowerCase() === 'published' || String(d.status).toLowerCase() === 'open'))).catch((err) => { setLoadError(getErrorMessage(err, 'Could not load drives')) }),
      api.get('/drives/eligible').then(res => {
        const map = {}
        ;(res.data || []).forEach(d => { map[d.id] = { eligible: d.eligible, reasons: d.eligibilityReasons || [], skillMatch: d.skillMatch, checks: d.checks } })
        setEligibilityMap(map)
      }).catch(() => {}),
      loadApplications()
    ]).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const handleRegister = async (drive) => {
    setErrorMsg('')
    setRegisteringId(drive.id)
    try {
      await api.post(`/drives/${drive.id}/register`)
      await loadApplications()
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      const reasons = err.response?.data?.eligibilityReasons || err.response?.data?.reasons
      setErrorMsg(reasons && reasons.length ? `${msg}: ${reasons.map(r => r.message).join(' ')}` : msg)
    } finally {
      setRegisteringId(null)
    }
  }

  const filtered = useMemo(() => {
    const list = drives.filter(d => {
      const q = search.toLowerCase()
      const matchSearch = !q || String(d.company || '').toLowerCase().includes(q) || String(d.role || '').toLowerCase().includes(q) || String(d.location || '').toLowerCase().includes(q)
      const matchEligible = !eligibleOnly || (eligibilityMap[d.id]?.eligible === true)
      const isReg = registeredIds.has(d.id)
      const matchStatus = !statusFilter || (statusFilter === 'applied' ? isReg : !isReg)
      return matchSearch && matchEligible && matchStatus
    })
    list.sort((a, b) => {
      if (sortBy === 'deadline') return new Date(a.deadline || '9999') - new Date(b.deadline || '9999')
      if (sortBy === 'package') return String(b.salary || '').localeCompare(String(a.salary || ''))
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    })
    return list
  }, [drives, search, eligibleOnly, statusFilter, sortBy, eligibilityMap, registeredIds])

  if (loading) return <LoadingState lines={6} title="Finding drives for you…" />
  if (loadError && drives.length === 0) return <ErrorState message="Could not load drives" detail={loadError} onRetry={load} />

  return (
    <div>
      <PageHeader eyebrow="Job portal" title="Placement Drives" subtitle={`${filtered.length} open · eligibility from the live backend engine`} />

      <div className="surface p-4 mb-4 grid sm:grid-cols-[1fr_170px_170px] gap-3">
        <Field label="Search">
          <div className="input-icon-wrap"><Search size={15} className="icon-left" /><Input placeholder="Company, role, location…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </Field>
        <Field label="Application">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="not-applied">Not applied</option>
            <option value="applied">Applied</option>
          </Select>
        </Field>
        <Field label="Sort by">
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="deadline">Deadline</option>
            <option value="newest">Newest</option>
            <option value="package">Package</option>
          </Select>
        </Field>
        <label className="sm:col-span-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" checked={eligibleOnly} onChange={e => setEligibleOnly(e.target.checked)} className="w-4 h-4 accent-emerald-600 rounded" />
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} className="text-emerald-600" /> Eligible only</span>
        </label>
      </div>

      {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{errorMsg}</div>}

      {drives.length === 0 ? (
        <EmptyState title="No open drives right now" subtitle="New placement drives will appear here as soon as the placement cell publishes them." />
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => { setSearch(''); setEligibleOnly(false); setStatusFilter('') }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(drive => {
            const info = eligibilityMap[drive.id] || { eligible: false, reasons: [], skillMatch: null }
            const eligible = info.eligible === true
            const registered = registeredIds.has(drive.id)
            const skillMatch = info.skillMatch || null
            const skills = drive.requiredSkills?.length ? drive.requiredSkills : (drive.skills || [])
            return (
              <article key={drive.id} className="surface surface-hover p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <CompanyLogo name={drive.company} size={46} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-900 truncate">{drive.company}</h3>
                    <p className="text-sm text-slate-600 truncate">{drive.role}</p>
                  </div>
                  {registered ? <StatusBadge status="REGISTERED" /> : <StatusBadge status={eligible ? 'Eligible' : 'Not Eligible'} />}
                </div>
                <p className="text-[15px] font-extrabold text-emerald-700">{drive.salary || drive.package || '—'}</p>
                <div className="mt-1 space-y-1 text-[13px] text-slate-500">
                  <p className="flex items-center gap-1.5"><MapPin size={13} /> {drive.location || '—'} · {drive.workMode || '—'}</p>
                  <p className="flex items-center gap-1.5"><CalendarDays size={13} /> Drive {formatDate(drive.driveDate)} · Closes {formatDate(drive.deadline)}</p>
                </div>
                <div className="mt-2.5"><SkillChips skills={skills} matched={skillMatch?.matchedSkills} missing={skillMatch?.missingSkills} /></div>
                <p className="mt-2 text-xs font-semibold text-brand-700">{deadlineLabel(drive.deadline)}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                  {registered ? (
                    <Link to={`/student/drives/${drive.id}`} className="btnx btnx-secondary btnx-sm flex-1">Track application</Link>
                  ) : eligible ? (
                    <Button size="sm" variant="success" className="flex-1" loading={registeringId === drive.id} onClick={() => handleRegister(drive)}>
                      {registeringId === drive.id ? 'Applying…' : 'Apply now'}
                    </Button>
                  ) : (
                    <Link to={`/student/drives/${drive.id}`} className="btnx btnx-secondary btnx-sm flex-1">View eligibility</Link>
                  )}
                  <Link to={`/student/drives/${drive.id}`} className="btnx btnx-ghost btnx-sm" aria-label={`View ${drive.company} details`}>Details <ArrowRight size={14} /></Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
