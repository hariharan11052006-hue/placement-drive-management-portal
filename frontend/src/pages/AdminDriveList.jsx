import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import { Plus, Eye, Pencil, Copy, Trash2, Search, Upload, XCircle, ChevronDown, Briefcase } from 'lucide-react'
import { PageHeader, Button, Field, Input, Select, StatusBadge, LoadingState, ErrorState, NoResults, EmptyState, Modal } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'
import { formatDate } from '../utils/driveUtils'

function ActionMenu({ drive, onDuplicate, onStatus, onDelete }) {
  const [open, setOpen] = useState(false)
  const isPub = String(drive.status).toLowerCase() === 'published'
  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false) }}>
      <button onClick={() => setOpen(v => !v)} className="btnx btnx-secondary btnx-sm" aria-haspopup="menu" aria-expanded={open}>
        Actions <ChevronDown size={14} />
      </button>
      {open && (
        <div className="anim-pop absolute right-0 mt-1.5 w-48 surface p-1.5 z-20" role="menu">
          <Link to={`/admin/drives/${drive.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100" onClick={() => setOpen(false)}><Eye size={15} /> View</Link>
          <Link to={`/admin/drives/${drive.id}/edit`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100" onClick={() => setOpen(false)}><Pencil size={15} /> Edit</Link>
          <button onClick={() => { setOpen(false); onDuplicate(drive.id) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><Copy size={15} /> Duplicate</button>
          {!isPub
            ? <button onClick={() => { setOpen(false); onStatus(drive.id, 'published') }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-700 hover:bg-green-50"><Upload size={15} /> Publish</button>
            : <button onClick={() => { setOpen(false); onStatus(drive.id, 'closed') }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-amber-700 hover:bg-amber-50"><XCircle size={15} /> Close</button>}
          <button onClick={() => { setOpen(false); onDelete(drive.id) }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50"><Trash2 size={15} /> Delete</button>
        </div>
      )}
    </div>
  )
}

export default function AdminDriveList() {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirm, setConfirm] = useState(null) // {type, drive}

  const fetchDrives = async () => {
    setError('')
    try {
      const res = await api.get('/drives?includeAll=true')
      setDrives(res.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load drives'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrives() }, [])

  const counts = useMemo(() => {
    const c = { all: drives.length, published: 0, draft: 0, closed: 0, cancelled: 0 }
    drives.forEach(d => { const s = String(d.status || '').toLowerCase(); if (c[s] !== undefined) c[s]++ })
    return c
  }, [drives])

  const filtered = drives.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || String(d.company || '').toLowerCase().includes(q) || String(d.role || '').toLowerCase().includes(q) || String(d.location || '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || String(d.status || '').toLowerCase() === statusFilter
    return matchSearch && matchStatus
  })

  const doDuplicate = async (id) => {
    try { await api.post(`/drives/${id}/duplicate`); fetchDrives() }
    catch (err) { alert(getErrorMessage(err, 'Duplicate failed')) }
  }
  const doStatus = async (id, status) => {
    try { await api.put(`/drives/${id}/status`, { status }); fetchDrives() }
    catch (err) { alert(getErrorMessage(err, 'Status change failed')) }
    finally { setConfirm(null) }
  }
  const doDelete = async (id) => {
    try { await api.delete(`/drives/${id}`); setDrives(drives.filter(d => d.id !== id)) }
    catch (err) { alert(getErrorMessage(err, 'Delete failed')) }
    finally { setConfirm(null) }
  }

  if (loading) return <LoadingState lines={6} title="Loading placement drives…" />
  if (error && drives.length === 0) return <ErrorState message="Could not load drives" detail={error} onRetry={() => { setLoading(true); fetchDrives() }} />

  return (
    <div>
      <PageHeader
        eyebrow="Placements"
        title="Placement Drives"
        subtitle={`${counts.all} drives · ${counts.published} published · ${counts.draft} draft`}
        actions={<Link to="/admin/drives/new" className="btnx btnx-primary"><Plus size={16} /> Create Drive</Link>}
      />

      <div className="surface p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <Field label="Search">
            <div className="input-icon-wrap">
              <Search size={16} className="icon-left" />
              <Input placeholder="Company, role, location…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </Field>
        </div>
        <div className="w-44">
          <Field label="Status">
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-1.5 pb-0.5">
          {[['', `All (${counts.all})`], ['published', `Published (${counts.published})`], ['draft', `Draft (${counts.draft})`]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} className={`btnx btnx-sm ${statusFilter === v ? 'btnx-primary' : 'btnx-secondary'}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

      {drives.length === 0 ? (
        <EmptyState icon={<Briefcase size={26} />} title="No placement drives yet" subtitle="Create your first drive — it will appear here with status, deadline and actions." action={<Link to="/admin/drives/new" className="btnx btnx-primary btnx-sm"><Plus size={15} /> Create Drive</Link>} />
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => { setSearch(''); setStatusFilter('') }} />
      ) : (
        <div className="table-shell">
          <div className="table-scroll">
            <table className="tablex tablex-fixed" style={{ minWidth: 760 }}>
              <colgroup>
                <col />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead><tr><th>Company</th><th>Package</th><th>Deadline</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(drive => (
                  <tr key={drive.id}>
                    <td>
                      <div className="company-cell">
                        <CompanyLogo name={drive.company} size={38} />
                        <span className="company-cell-text">
                          <span className="cell-main">{drive.company || '—'}</span>
                          <span className="cell-sub">{drive.role || '—'} · {drive.location || '—'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="cell-num font-semibold text-slate-800">{drive.salary || drive.package || '—'}</td>
                    <td className="cell-num">{formatDate(drive.deadline)}</td>
                    <td className="badge-cell"><StatusBadge status={drive.status} /></td>
                    <td><div className="actions-cell"><ActionMenu drive={drive} onDuplicate={doDuplicate} onStatus={(id, s) => setConfirm({ type: 'status', drive, status: s })} onDelete={(id) => setConfirm({ type: 'delete', drive })} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? 'Delete drive?' : `Change status to ${confirm?.status ? confirm.status.charAt(0).toUpperCase() + confirm.status.slice(1) : ''}?`}
        subtitle={confirm ? `${confirm.drive.company} · ${confirm.drive.role}` : ''}
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setConfirm(null)}>Cancel</Button>
          {confirm?.type === 'delete'
            ? <Button variant="danger-solid" size="sm" onClick={() => doDelete(confirm.drive.id)}>Delete</Button>
            : <Button size="sm" onClick={() => doStatus(confirm.drive.id, confirm.status)}>Confirm</Button>}
        </>}
      >
        <p className="text-sm text-slate-600">
          {confirm?.type === 'delete'
            ? 'Registration history is kept, but the drive will be removed from listings.'
            : confirm?.status === 'published'
              ? 'Students will be notified about the newly published drive.'
              : 'Students will no longer be able to apply to this drive.'}
        </p>
      </Modal>
    </div>
  )
}
