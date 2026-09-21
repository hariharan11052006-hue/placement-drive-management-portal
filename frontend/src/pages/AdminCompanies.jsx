import React, { useEffect, useMemo, useState } from 'react'
import api, { getErrorMessage } from '../services/api'
import { Building2, Plus, Pencil, Trash2, Search, Globe, CheckCircle2, ExternalLink } from 'lucide-react'
import { PageHeader, Button, Field, Input, Textarea, LoadingState, ErrorState, EmptyState, NoResults, Modal, SkillChips } from '../components/ui'
import CompanyLogo from '../components/CompanyLogo'

const emptyCompany = { name: '', website: '', careersUrl: '', industry: '', location: '', description: '', requirements: '', skills: '', hrContact: '' }

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyCompany)
  const [saving, setSaving] = useState(false)
  const [syncPreview, setSyncPreview] = useState(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/companies')
      setCompanies(res.data || [])
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load companies'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const filtered = useMemo(() => companies.filter(c =>
    String(c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(c.industry || '').toLowerCase().includes(search.toLowerCase())
  ), [companies, search])

  const openCreate = () => { setEditing(null); setForm(emptyCompany); setShowForm(true); setSyncPreview(null) }
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyCompany, ...c, skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || '') }); setShowForm(true); setSyncPreview(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Company name is required.'); return }
    setSaving(true)
    try {
      const payload = { ...form, skills: String(form.skills || '').split(',').map(s => s.trim()).filter(Boolean) }
      if (editing) await api.put(`/companies/${editing.id}`, payload)
      else await api.post('/companies', payload)
      setShowForm(false)
      fetchCompanies()
    } catch (err) {
      setError(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await api.delete(`/companies/${confirmDelete.id}`)
      setCompanies(companies.filter(c => c.id !== confirmDelete.id))
    } catch (err) {
      alert(getErrorMessage(err, 'Delete failed'))
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleSyncPreview = async (id) => {
    setSyncLoading(true)
    setSyncPreview(null)
    try {
      const res = await api.post(`/companies/${id}/sync/preview`)
      setSyncPreview(res.data)
    } catch (err) {
      setSyncPreview({ error: getErrorMessage(err, 'Sync failed'), manualEntry: true, jobs: [] })
    } finally {
      setSyncLoading(false)
    }
  }

  const handleApproveJob = async (companyId, job) => {
    try {
      await api.post(`/companies/${companyId}/sync/approve`, { job })
      alert('Draft drive created. Review it in Drives before publishing.')
      setSyncPreview(null)
    } catch (err) {
      alert(getErrorMessage(err, 'Approve failed'))
    }
  }

  if (loading) return <LoadingState lines={5} title="Loading companies…" />
  if (error && companies.length === 0) return <ErrorState message="Could not load companies" detail={error} onRetry={() => { setLoading(true); fetchCompanies() }} />

  return (
    <div>
      <PageHeader
        eyebrow="Partners"
        title="Companies"
        subtitle={`${companies.length} partners · reusable requirements for drives`}
        actions={<Button onClick={openCreate}><Plus size={16} /> Add Company</Button>}
      />

      <div className="surface p-4 mb-4">
        <div className="input-icon-wrap">
          <Search size={16} className="icon-left" />
          <Input placeholder="Search companies or industries…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="surface p-5 md:p-6 mb-4 anim-pop">
          <h3 className="font-bold text-slate-900 mb-1">{editing ? 'Edit company' : 'New company'}</h3>
          <p className="text-sm text-slate-500 mb-4">Requirements here are reusable — they never auto-overwrite a drive.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name" required><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="TCS" /></Field>
            <Field label="Industry"><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Information Technology" /></Field>
            <Field label="Website"><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://…" /></Field>
            <Field label="Careers URL" hint="HTTPS only · used for sync preview"><Input value={form.careersUrl} onChange={e => setForm({ ...form, careersUrl: e.target.value })} placeholder="https://careers…" /></Field>
            <Field label="Location"><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Chennai" /></Field>
            <Field label="HR contact"><Input value={form.hrContact} onChange={e => setForm({ ...form, hrContact: e.target.value })} placeholder="hr@company.com" /></Field>
            <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></Field></div>
            <div className="md:col-span-2"><Field label="Requirements"><Textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} rows={2} /></Field></div>
            <div className="md:col-span-2"><Field label="Skills" hint="Comma separated"><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="Java, React, SQL" /></Field></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" loading={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add company'}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {companies.length === 0 ? (
        <EmptyState icon={<Building2 size={26} />} title="No companies yet" subtitle="Add hiring partners to reuse them when creating drives." action={<Button size="sm" onClick={openCreate}><Plus size={15} /> Add Company</Button>} />
      ) : filtered.length === 0 ? (
        <NoResults onClear={() => setSearch('')} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(company => (
            <div key={company.id} className="surface surface-hover p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <CompanyLogo name={company.name} size={46} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900 truncate">{company.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{company.industry || '—'} · {company.location || '—'}</p>
                  {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-1 mt-0.5">Website <ExternalLink size={11} /></a>}
                </div>
                <span className="badgex badge-blue shrink-0">{company.totalDrives ?? 0} drives</span>
              </div>
              <div className="mb-3"><SkillChips skills={Array.isArray(company.skills) ? company.skills : []} /></div>
              <p className="text-xs text-slate-500 mb-4">Sync: {company.syncStatus || 'pending'}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => openEdit(company)}><Pencil size={14} /> Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => handleSyncPreview(company.id)} loading={syncLoading}><Globe size={14} /> Sync preview</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(company)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {syncLoading && <div className="surface p-4 mt-4 text-sm text-slate-600">Fetching public careers page… (respects robots.txt, HTTPS-only)</div>}
      {syncPreview && (
        <div className="surface p-5 md:p-6 mt-4 anim-pop">
          <h3 className="font-bold text-slate-900 mb-1">Sync preview</h3>
          {syncPreview.sourceUrl && <a href={syncPreview.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline break-all">{syncPreview.sourceUrl}</a>}
          {syncPreview.error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">{syncPreview.error} You can enter requirements manually.</p>}
          {syncPreview.note && <p className="text-xs text-slate-500 mt-2">{syncPreview.note}</p>}
          {(!syncPreview.jobs || syncPreview.jobs.length === 0) && !syncPreview.error && <p className="text-sm text-slate-500 mt-2">No job postings found. Enter requirements manually.</p>}
          <div className="grid md:grid-cols-2 gap-2.5 mt-3">
            {(syncPreview.jobs || []).map((job, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3.5 text-sm bg-slate-50/50">
                <p className="font-bold text-slate-900">{job.title}</p>
                <p className="text-xs text-slate-500">{job.location} · {job.salary}</p>
                <p className="text-xs mt-1.5 text-slate-600">Skills: {(job.requiredSkills || []).join(', ') || 'Not specified'}</p>
                <Button size="sm" variant="success" className="mt-2.5" onClick={() => { if (window.confirm(`Create a DRAFT drive from "${job.title}"? It will NOT be auto-published.`)) handleApproveJob(syncPreview.companyId, job) }}><CheckCircle2 size={14} /> Approve as DRAFT</Button>
              </div>
            ))}
          </div>
          <button onClick={() => setSyncPreview(null)} className="mt-3 text-sm font-semibold text-slate-500 hover:text-slate-800">Close preview</button>
        </div>
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete company?"
        subtitle={confirmDelete?.name}
        footer={<><Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="danger-solid" size="sm" onClick={handleDelete}>Delete</Button></>}>
        <p className="text-sm text-slate-600">Drives for this company are kept.</p>
      </Modal>
    </div>
  )
}
