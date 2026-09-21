import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { ClipboardList, CheckCircle2, XCircle, Trophy, Search, Inbox } from 'lucide-react'
import ExportButtons from '../components/ExportButtons'
import CompanyLogo from '../components/CompanyLogo'
import { PageHeader, Button, Field, Input, Select, StatCard, StatusBadge, LoadingState, ErrorState, EmptyState, NoResults } from '../components/ui'
import { formatDate } from '../utils/driveUtils'

export default function AdminRegistrations() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [notes, setNotes] = useState({})
  const [acting, setActing] = useState(false)
  const [filters, setFilters] = useState({ search: '', company: '', department: '', status: '', eligibility: '', sortBy: '' })

  const fetchAll = async (f = filters) => {
    setError('')
    try {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (f.company) params.set('company', f.company)
      if (f.department) params.set('department', f.department)
      if (f.status) params.set('status', f.status)
      if (f.eligibility) params.set('eligibility', f.eligibility)
      if (f.sortBy) params.set('sortBy', f.sortBy)
      const res = await api.get(`/admin/registered-students?${params.toString()}`)
      setRegistrations((res.data || []).map(r => ({ ...r, id: r.registrationId, status: r.applicationStatus })))
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load registrations'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setLoading(true); fetchAll() }, [])

  const summary = useMemo(() => {
    const s = { total: registrations.length, applied: 0, shortlisted: 0, selected: 0, rejected: 0 }
    registrations.forEach(r => {
      const st = String(r.status).toUpperCase()
      if (st === 'REGISTERED' || st === 'APPLIED') s.applied++
      else if (st === 'SHORTLISTED') s.shortlisted++
      else if (st === 'SELECTED') s.selected++
      else if (st === 'REJECTED') s.rejected++
    })
    return s
  }, [registrations])

  const updateStatus = async (id, status) => {
    setActing(true)
    try {
      await api.put(`/registrations/${id}/status`, { status, notes: notes[id] || '' })
      setRegistrations(registrations.map(r => r.id === id ? { ...r, status, applicationStatus: status } : r))
    } catch (err) {
      alert(getErrorMessage(err, 'Status update failed'))
    } finally {
      setActing(false)
    }
  }

  const handleBulk = async (action) => {
    if (selected.length === 0) return
    setActing(true)
    try {
      await api.post(`/registrations/bulk-${action}`, { ids: selected, notes: notes['bulk'] || '' })
      setSelected([])
      setLoading(true)
      fetchAll()
    } catch (err) {
      alert(getErrorMessage(err, 'Bulk action failed'))
    } finally {
      setActing(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const clearFilters = () => {
    const cleared = { search: '', company: '', department: '', status: '', eligibility: '', sortBy: '' }
    setFilters(cleared)
    setLoading(true)
    fetchAll(cleared)
  }

  if (loading && registrations.length === 0) return <LoadingState lines={6} title="Loading registrations…" />
  if (error && registrations.length === 0) return <ErrorState message="Could not load registrations" detail={error} onRetry={() => { setLoading(true); fetchAll() }} />

  const allChecked = selected.length > 0 && selected.length === registrations.length

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Registrations"
        subtitle="Shortlist, select or reject — every action is logged and notified."
        actions={<ExportButtons data={registrations} filename="registrations" />}
      />

      {/* Statistics — equal height / width / spacing via grid stretch + h-full cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-4 items-stretch">
        <StatCard label="Total" value={summary.total} hint="Applications" icon={<ClipboardList size={19} />} tone="slate" />
        <StatCard label="Applied" value={summary.applied} hint="Awaiting review" icon={<Inbox size={19} />} tone="blue" />
        <StatCard label="Shortlisted" value={summary.shortlisted} hint="In pipeline" icon={<CheckCircle2 size={19} />} tone="yellow" />
        <StatCard label="Selected" value={summary.selected} hint="Offers" icon={<Trophy size={19} />} tone="green" />
        <StatCard label="Rejected" value={summary.rejected} hint="Not progressed" icon={<XCircle size={19} />} tone="red" />
      </div>

      {/* Filter bar — equal-height controls, aligned labels, button flush with inputs */}
      <form onSubmit={(e) => { e.preventDefault(); setLoading(true); fetchAll() }} className="surface p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end">
        <Field label="Search">
          <div className="input-icon-wrap"><Search size={15} className="icon-left" /><Input placeholder="Student or company…" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div>
        </Field>
        <Field label="Company"><Input placeholder="Company" value={filters.company} onChange={e => setFilters({ ...filters, company: e.target.value })} /></Field>
        <Field label="Department"><Input placeholder="Department" value={filters.department} onChange={e => setFilters({ ...filters, department: e.target.value })} /></Field>
        <Field label="Status">
          <Select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="REGISTERED">Applied</option>
            <option value="SHORTLISTED">Shortlisted</option>
            <option value="SELECTED">Selected</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </Select>
        </Field>
        <Field label="Eligibility">
          <Select value={filters.eligibility} onChange={e => setFilters({ ...filters, eligibility: e.target.value })}>
            <option value="">All</option>
            <option value="eligible">Eligible</option>
            <option value="not_eligible">Not Eligible</option>
          </Select>
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>Apply</Button>
          <Button type="button" variant="ghost" onClick={clearFilters}>Reset</Button>
        </div>
      </form>

      {selected.length > 0 && (
        <div className="surface p-4 mb-4 flex items-center gap-3 flex-wrap border-brand-100 !bg-brand-50/50 anim-pop">
          <span className="text-sm font-bold text-slate-800 tabular-nums min-w-[92px]">{selected.length} selected</span>
          <Input placeholder="Notes for bulk action" value={notes['bulk'] || ''} onChange={e => setNotes({ ...notes, bulk: e.target.value })} className="flex-1 min-w-[180px] !bg-white" />
          <Button variant="success" size="sm" loading={acting} onClick={() => handleBulk('shortlist')}><CheckCircle2 size={15} /> Shortlist</Button>
          <Button variant="danger" size="sm" loading={acting} onClick={() => handleBulk('reject')}><XCircle size={15} /> Reject</Button>
        </div>
      )}

      {registrations.length === 0 ? (
        <EmptyState icon={<ClipboardList size={26} />} title="No registrations yet" subtitle="Applications appear here as soon as students apply." />
      ) : (
        <div className="table-shell"><div className="table-scroll"><table className="tablex tablex-fixed" style={{ minWidth: 880 }}>
          <colgroup>
            <col style={{ width: 44 }} />
            <col />
            <col style={{ width: '24%' }} />
            <col style={{ width: 128 }} />
            <col style={{ width: 118 }} />
            <col style={{ width: 228 }} />
          </colgroup>
          <thead><tr>
            <th className="check-cell"><input type="checkbox" checked={allChecked} onChange={e => setSelected(e.target.checked ? registrations.map(r => r.id) : [])} className="checkx" aria-label="Select all" /></th>
            <th>Student</th><th>Company</th><th>Eligibility</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th>
          </tr></thead>
          <tbody>
            {registrations.map(reg => (
              <tr key={reg.id}>
                <td className="check-cell"><input type="checkbox" checked={selected.includes(reg.id)} onChange={() => toggleSelect(reg.id)} className="checkx" aria-label={`Select ${reg.studentName || 'application'}`} /></td>
                <td>
                  <div className="cell-lines">
                    <span className="cell-main">{reg.studentName || '—'}</span>
                    <span className="cell-sub">{reg.department || '—'}</span>
                    <span className="cell-meta">CGPA {reg.cgpa ?? '—'} • {formatDate(reg.registrationDate)}</span>
                  </div>
                </td>
                <td>
                  <div className="company-cell">
                    <CompanyLogo name={reg.company} size={36} />
                    <span className="company-cell-text">
                      <span className="cell-main">{reg.company || '—'}</span>
                      <span className="cell-sub">{reg.jobRole || '—'}</span>
                    </span>
                  </div>
                </td>
                <td className="badge-cell"><StatusBadge status={reg.eligibilityStatus} /></td>
                <td className="badge-cell"><StatusBadge status={reg.status} /></td>
                <td>
                  <div className="actions-cell">
                    {(reg.status === 'REGISTERED' || reg.status === 'APPLIED') && <Button variant="secondary" size="sm" disabled={acting} onClick={() => updateStatus(reg.id, 'SHORTLISTED')}>Shortlist</Button>}
                    {reg.status !== 'SELECTED' && <Button variant="success" size="sm" disabled={acting} onClick={() => updateStatus(reg.id, 'SELECTED')}>Select</Button>}
                    {reg.status !== 'REJECTED' && <Button variant="danger" size="sm" disabled={acting} onClick={() => updateStatus(reg.id, 'REJECTED')}>Reject</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </div>
  )
}
